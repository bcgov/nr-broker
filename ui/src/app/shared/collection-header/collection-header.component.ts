import { Component, Inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';

import { GraphUtilService } from '../../service/graph-util.service';
import { CollectionNames } from '../../service/dto/collection-dto-union.type';
import { CollectionConfigRestDto } from '../../service/dto/collection-config-rest.dto';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { VertexDialogComponent } from '../../graph/vertex-dialog/vertex-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { TagDialogComponent } from '../../graph/tag-dialog/tag-dialog.component';
import { DeleteConfirmDialogComponent } from '../../graph/delete-confirm-dialog/delete-confirm-dialog.component';
import { GraphApiService } from '../../service/graph-api.service';
import { InspectorTeamComponent } from '../../graph/inspector-team/inspector-team.component';
import { CONFIG_MAP } from '../../app-initialize.factory';
import { CollectionConfigMap } from '../../service/graph.types';
import { combineLatest, of } from 'rxjs';
import { CollectionCombo } from '../../service/dto/collection-search-result.dto';

@Component({
  selector: 'app-collection-header',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDividerModule,
    MatCardModule,
    MatIconModule,
    InspectorTeamComponent,
  ],
  templateUrl: './collection-header.component.html',
  styleUrl: './collection-header.component.scss',
})
export class CollectionHeaderComponent {
  @Input() collection!: CollectionNames;
  @Input() vertex!: string;
  @Input() name!: string;
  @Input({ required: false }) comboData!: CollectionCombo<any>;
  @Input() hasDelete!: boolean;
  @Input() hasUpdate!: boolean;
  @Input() screenSize!: string;

  config: CollectionConfigRestDto | undefined;

  constructor(
    private readonly dialog: MatDialog,
    private readonly graphUtil: GraphUtilService,
    private readonly graphApi: GraphApiService,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    @Inject(CONFIG_MAP) private readonly configMap: CollectionConfigMap,
  ) {}

  ngOnInit(): void {
    this.config = this.configMap[this.collection];
  }

  openInGraph() {
    if (this.vertex) {
      this.graphUtil.openInGraph(this.vertex, 'vertex');
    }
  }

  back() {
    this.router.navigate(['..'], { relativeTo: this.activatedRoute });
  }

  isBrowseDisabled() {
    return !this.config?.permissions.browse;
  }

  edit() {
    combineLatest(
      this.comboData
        ? [of(this.comboData.collection), of(this.comboData.vertex)]
        : [
            this.graphApi.getCollectionData(this.collection, this.vertex),
            this.graphApi.getVertex(this.vertex),
          ],
    ).subscribe(([data, vertex]) => {
      this.dialog
        .open(VertexDialogComponent, {
          width: '500px',
          data: {
            collection: this.collection,
            vertex,
            data,
          },
        })
        .afterClosed()
        .subscribe((result) => {
          if (result && result.refresh) {
            // this.refreshData();
          }
        });
    });
  }

  editTags() {
    (this.comboData
      ? of(this.comboData.collection)
      : this.graphApi.getCollectionData(this.collection, this.vertex)
    ).subscribe((collectionData) => {
      this.dialog
        .open(TagDialogComponent, {
          width: '500px',
          data: {
            collection: this.collection,
            collectionData,
          },
        })
        .afterClosed()
        .subscribe((result) => {
          if (result && result.refresh) {
            // this.refreshData();
          }
        });
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
          this.graphApi.deleteVertex(this.vertex).subscribe(() => {
            // this.refreshData();
          });
        }
      });
  }
}
