import { Component, OnChanges, OnInit, SimpleChanges, computed, inject, input, signal } from '@angular/core';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { TitleCasePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  map,
  of,
  switchMap,
} from 'rxjs';
import {
  Connection,
  VertexNavigation,
  GraphDataVertex,
  CollectionConfigNameRecord,
  InspectorTarget,
  InspectorTargetEdge,
  InspectorTargetVertex,
} from '../../service/graph.types';
import { GraphApiService } from '../../service/graph-api.service';
import { DeleteEdgeDialogComponent } from '../delete-edge-dialog/delete-edge-dialog.component';
import {
  CONFIG_ARR,
  CONFIG_RECORD,
  CURRENT_USER,
} from '../../app-initialize.factory';
import { PreferencesService } from '../../preferences.service';
import { DeleteConfirmDialogComponent } from '../delete-confirm-dialog/delete-confirm-dialog.component';
import { InspectorEdgeComponent } from '../inspector-edge/inspector-edge.component';
import { InspectorVertexComponent } from '../inspector-vertex/inspector-vertex.component';
import { TagDialogComponent } from '../tag-dialog/tag-dialog.component';
import { PermissionService } from '../../service/permission.service';
import { InspectorConnectionsComponent } from '../inspector-connections/inspector-connections.component';
import { CollectionApiService } from '../../service/collection-api.service';
import { VertexDialogComponent } from '../vertex-dialog/vertex-dialog.component';
import { EdgeDialogComponent } from '../edge-dialog/edge-dialog.component';
import { CollectionCombo } from '../../service/collection/dto/collection-search-result.dto';
import { EdgeComboDto } from '../../service/persistence/dto/edge-combo.dto';
import { InspectorPropertiesComponent } from '../inspector-properties/inspector-properties.component';
import { InspectorTimestampsComponent } from '../inspector-timestamps/inspector-timestamps.component';
import { GraphUtilService } from '../../service/graph-util.service';
import { EdgeDto } from '../../service/persistence/dto/edge.dto';
import { VertexDto } from '../../service/persistence/dto/vertex.dto';
import { UserSelfDto } from '../../service/persistence/dto/user.dto';

@Component({
  selector: 'app-inspector',
  templateUrl: './inspector.component.html',
  styleUrls: ['./inspector.component.scss'],
  imports: [
    ClipboardModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatTableModule,
    MatChipsModule,
    RouterModule,
    InspectorConnectionsComponent,
    InspectorEdgeComponent,
    InspectorVertexComponent,
    InspectorPropertiesComponent,
    InspectorTimestampsComponent,
    TitleCasePipe,
  ],
})
export class InspectorComponent implements OnChanges, OnInit {
  private readonly permission = inject(PermissionService);
  private readonly graphApi = inject(GraphApiService);
  private readonly collectionApi = inject(CollectionApiService);
  private readonly dialog = inject(MatDialog);
  private readonly preferences = inject(PreferencesService);
  private readonly graphUtil = inject(GraphUtilService);
  readonly user = inject<UserSelfDto>(CURRENT_USER);
  readonly configArr = inject(CONFIG_ARR);
  readonly configMap = inject<CollectionConfigNameRecord>(CONFIG_RECORD);

  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  target = input<InspectorTarget | undefined>();
  targetSubject = new BehaviorSubject<InspectorTarget | undefined>(undefined);
  config = computed(() => {
    const target = this.target();
    if (target && target.type === 'vertex') {
      return this.configMap[target.collection];
    }
    // Default of 'user' config if target is undefined or an edge
    return this.configMap['user'];
  });

  public comboData = signal<CollectionCombo<any> | EdgeComboDto | null>(null);
  public navigationFollows = signal<'vertex' | 'edge'>('vertex');

  propPeopleDisplayedColumns: string[] = ['role', 'name', 'via'];
  titleWidth = 0;

  // Permissions
  hasAdmin = signal(false);
  hasSudo = signal(false);
  hasUpdate = signal(false);
  hasDelete = signal(false);

  ngOnInit(): void {
    this.hasAdmin.set(this.permission.hasAdmin());

    this.targetSubject
      .pipe(
        switchMap((target) => {
          if (target) {
            if (target.type === 'vertex') {
              return this.getVertexTargetData(target);
            } else {
              return this.getEdgeTargetData(target);
            }
          }
          return of(null);
        }),
      )
      .subscribe((data) => {
        this.comboData.set(data);
        // console.log('reloaded!');
      });

    combineLatest([
      this.targetSubject,
      this.graphApi.getUserPermissions(),
    ]).subscribe(([target, permissions]) => {
      if (!target) {
        return;
      }
      const targetId = target.type === 'edge' ? target.target : target.id;
      this.hasDelete.set(this.permission.hasDelete(permissions, targetId));
      this.hasUpdate.set(this.permission.hasUpdate(permissions, targetId));
      this.hasSudo.set(this.permission.hasSudo(permissions, targetId));
    });
    window.dispatchEvent(new Event('resize'));
    this.navigationFollows.set(this.preferences.get('graphFollows'));
  }

  ngOnChanges(changes: SimpleChanges) {
    const targetChange = changes['target'];
    if (targetChange && this.target()?.id !== targetChange.previousValue?.id) {
      this.comboData.set(null);
      if (this.target) {
        this.targetSubject.next(this.target());
      }
    }
  }

  getTargetId(): string {
    return this.target()?.id ?? '';
  }

  selectEdge(id: string) {
    // console.log(`selectEdge: ${id}`);
    this.graphUtil.openInGraph(id, 'edge');
  }

  selectVertex(id: string) {
    // console.log(`selectVertex: ${id}`);
    this.graphUtil.openInGraph(id, 'vertex');
  }

  navigate(target: EdgeDto | VertexDto) {
    if ('collection' in target) {
      this.collectionApi
        .searchCollection(target.collection, {
          vertexId: target.id,
          offset: 0,
          limit: 1,
        })
        .subscribe((result) => {
          if (result && result.meta.total > 0) {
            this.selectVertex(result.data[0].vertex.id);
          }
        });
    } else {
      this.selectEdge(target.id);
    }
  }

  editTarget() {
    const comboData = this.comboData();
    if (!this.target) {
      return;
    }
    if (comboData?.type === 'edge') {
      const sourceIndex = comboData.edge.is;
      const config = Object.values(this.configArr).find((config) => {
        return config.index === sourceIndex;
      });
      if (config) {
        const edgeConfig = config.edges.find(
          (e) => e.collection === comboData.target.collection && e.name === comboData.edge.name,
        );
        const prototype = edgeConfig?.prototypes?.find(
          (p) => p.target === comboData.edge.target,
        );
        // console.log('Editing edge with prototype', prototype);
        this.dialog.open(EdgeDialogComponent, {
          width: '500px',
          data: {
            collection: config.collection,
            source: comboData.source,
            edge: comboData.edge,
            prototype,
          },
        });
      }
    } else if (comboData?.type === 'vertex') {
      this.dialog.open(VertexDialogComponent, {
        width: '500px',
        data: {
          collection: comboData.vertex.collection,
          data: comboData.collection,
          vertex: comboData.vertex,
        },
      });
    }
  }

  editTags() {
    const comboData = this.comboData();
    if (!comboData || !this.target) {
      return;
    }
    if (comboData.type === 'vertex') {
      this.dialog
        .open(TagDialogComponent, {
          width: '500px',
          data: {
            collection: comboData.vertex.collection,
            collectionData: comboData.collection,
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

  addEdgeToVertex(vertex: GraphDataVertex) {
    if (!vertex) {
      return;
    }
    this.dialog
      .open(EdgeDialogComponent, {
        width: '500px',
        data: {
          collection: vertex.collection,
          vertex,
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result && result.refresh) {
          // this.refreshData();
        }
      });
  }

  openDeleteEdgeDialog(targetConnections: VertexNavigation | null) {
    this.dialog
      .open(DeleteEdgeDialogComponent, {
        width: '500px',
        data: {
          connections: targetConnections,
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result && result.refresh) {
          // this.refreshData();
        }
      });
  }

  deleteTarget() {
    if (!this.target) {
      return;
    }

    this.dialog
      .open(DeleteConfirmDialogComponent, {
        width: '500px',
      })
      .afterClosed()
      .subscribe((result) => {
        const target = this.target();
        if (target && result && result.confirm) {
          const obs =
            target.type === 'vertex'
              ? this.graphApi.deleteVertex(target.id)
              : this.graphApi.deleteEdge(target.id);

          obs.subscribe(() => {
            // this.refreshData();
          });
        }
      });
  }

  navigateConnection($event: MouseEvent, item: Connection) {
    const isEdgeNav = this.navigationFollows() === 'edge';
    if ($event.altKey ? !isEdgeNav : isEdgeNav) {
      this.selectEdge(item.edge.id);
    } else {
      this.selectVertex(item.vertex.id);
    }
  }

  toggleNavigationFollows() {
    this.navigationFollows.set(
      this.navigationFollows() === 'vertex' ? 'edge' : 'vertex',
    );
    this.preferences.set('graphFollows', this.navigationFollows());
  }

  getVertexTargetData(target: InspectorTargetVertex) {
    if (target.type === 'vertex') {
      return this.collectionApi
        .searchCollection(target.collection, {
          vertexId: target.id,
          offset: 0,
          limit: 1,
        })
        .pipe(
          map((results) => {
            return results.data[0];
          }),
        );
    }

    return of(null);
  }

  getEdgeTargetData(target: InspectorTargetEdge): Observable<EdgeComboDto> {
    return combineLatest({
      edge: this.graphApi.getEdge(target.id),
      source: this.graphApi.getVertex(target.source),
      target: this.graphApi.getVertex(target.target),
    }).pipe(
      map((data) => {
        return {
          type: 'edge',
          ...data,
        };
      }),
    );
  }

  getFieldType(key: string) {
    const target = this.target();
    if (!target || target.type !== 'vertex') {
      return '';
    }
    return this.configMap[target.collection].fields[key].type;
  }

  refreshData() {
    if (this.target()) {
      this.targetSubject.next(this.target());
    }
  }
}
