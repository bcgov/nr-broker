import { Component, inject, input, OnInit, signal, OnDestroy, computed } from '@angular/core';
import { Router } from '@angular/router';
import { httpResource } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarConfig, MatSnackBarModule } from '@angular/material/snack-bar';
import { startWith, Subject, takeUntil } from 'rxjs';

import { ScreenService } from '../../util/screen.service';
import { GraphApiService } from '../../service/graph-api.service';
import { DeleteConfirmDialogComponent } from '../../graph/delete-confirm-dialog/delete-confirm-dialog.component';
import { GraphUtilService } from '../../service/graph-util.service';
import { EdgeDto } from '../../service/persistence/dto/edge.dto';
import { CONFIG_ARR } from '../../app-initialize.factory';
import { EdgeDialogComponent } from '../../graph/edge-dialog/edge-dialog.component';
import { VertexDto } from '../../service/persistence/dto/vertex.dto';
import { InspectorEdgeComponent } from '../../graph/inspector-edge/inspector-edge.component';
import { CollectionApiService } from '../../service/collection-api.service';
import { InspectorPropertiesComponent } from '../../graph/inspector-properties/inspector-properties.component';
import { InspectorTimestampsComponent } from '../../graph/inspector-timestamps/inspector-timestamps.component';

@Component({
  selector: 'app-edge-browser',
  imports: [
    InspectorEdgeComponent,
    InspectorPropertiesComponent,
    InspectorTimestampsComponent,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './edge-browser.component.html',
  styleUrl: './edge-browser.component.scss',
})
export class EdgeBrowserComponent implements OnInit, OnDestroy {
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly collectionApi = inject(CollectionApiService);

  readonly screen = inject(ScreenService);
  readonly configArr = inject(CONFIG_ARR);
  private readonly graphApi = inject(GraphApiService);
  private readonly graphUtil = inject(GraphUtilService);
  private readonly snackBar = inject(MatSnackBar);

  private ngUnsubscribe = new Subject<any>();

  public edgeId = input('');

  hasDelete = signal(true);
  hasUpdate = signal(true);
  showHelp = signal(false);

  config = computed(() => {
    if (this.edgeResource.isLoading() ||
      !this.edgeResource.hasValue()) {
      return undefined;
    }
    const edge = this.edgeResource.value();
    const sourceIndex = edge.is;
    return Object.values(this.configArr).find((config) => {
      return config.index === sourceIndex;
    });
  });

  prototype = computed(() => {
    if (this.edgeResource.isLoading() ||
      !this.edgeResource.hasValue() ||
      this.targetResource.isLoading() ||
      !this.targetResource.hasValue()) {
      return undefined;
    }
    const edge = this.edgeResource.value();
    const target = this.targetResource.value();
    const config = this.config();
    if (config) {
      const edgeConfig = config.edges.find(
        (e) => e.collection === target.collection && e.name === edge.name,
      );
      return edgeConfig?.prototypes?.find(
        (p) => p.target === edge.target,
      );
    }
    return undefined;
  });

  edgeResource = httpResource<EdgeDto>(() => {
    return this.graphApi.getEdgeArgs(this.edgeId());
  });

  sourceResource = httpResource<VertexDto>(() => {
    if (!this.edgeResource.hasValue()) {
      return undefined;
    }
    return this.graphApi.getVertexArgs(this.edgeResource.value().source);
  });

  targetResource = httpResource<VertexDto>(() => {
    if (!this.edgeResource.hasValue()) {
      return undefined;
    }
    return this.graphApi.getVertexArgs(this.edgeResource.value().target);
  });

  ngOnInit(): void {
    this.graphApi
      .createEventSource()
      .pipe(takeUntil(this.ngUnsubscribe), startWith(null))
      .subscribe((es: any) => {
        if (es !== null) {
          if (
            es.event === 'edge-edit'
          ) {
            if (es.edge.id === this.edgeId()) {
              this.openSnackBar('The object was updated.');
              this.refresh();
            }
          } else if (
            es.event === 'edge-delete'
          ) {
            if (es.vertex.indexOf(this.edgeId()) !== -1) {
              this.openSnackBar('The object was deleted.');
              this.back();
            }
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next(null);
    this.ngUnsubscribe.complete();
  }

  edit() {
    if (this.edgeResource.isLoading() ||
      !this.edgeResource.hasValue()) {
      return;
    }
    const edge = this.edgeResource.value();
    const source = this.sourceResource.value();
    const config = this.config();
    if (config) {
      const prototype = this.prototype();
      // console.log(config);
      // console.log(edgeConfig);
      // console.log(prototype);

      this.dialog.open(EdgeDialogComponent, {
        width: '500px',
        data: {
          collection: config.collection,
          source: source,
          edge: edge,
          prototype,
        },
      })
        .afterClosed()
        .subscribe((result) => {
          if (result && result.refresh) {
            // this.refreshData();
          }
        });
    }
  }

  openInGraph() {
    this.graphUtil.openInGraph(this.edgeId(), 'edge', false);
  }

  selectVertex(vertexId: string) {
    if (this.edgeResource.isLoading() || !this.edgeResource.hasValue()) {
      return;
    }

    const configIndex = this.edgeResource.value().source === vertexId
      ? this.edgeResource.value().is
      : this.edgeResource.value().it;

    const collection = this.configArr.find((config) => configIndex === config.index)?.collection;
    if (!collection) {
      return;
    }
    this.collectionApi
      .searchCollection(collection, {
        vertexId,
        offset: 0,
        limit: 1,
      })
      .subscribe((result) => {
        if (result && result.meta.total > 0) {
          this.router.navigate([
            '/browse',
            collection,
            result.data[0].collection.id,
          ]);
        }
      });
  }

  delete() {
    this.dialog
      .open(DeleteConfirmDialogComponent, {
        width: '500px',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result && result.confirm) {
          this.graphApi
            .deleteEdge(this.edgeId())
            .subscribe();
        }
      });
  }

  refresh() {
    this.edgeResource.reload();
  }

  back() {
    this.router.navigate(['/browse']);
  }

  private openSnackBar(message: string) {
    const config = new MatSnackBarConfig();
    config.duration = 5000;
    config.verticalPosition = 'bottom';
    this.snackBar.open(message, 'Dismiss', config);
  }
}
