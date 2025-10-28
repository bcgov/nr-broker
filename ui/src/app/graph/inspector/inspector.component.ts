import { Component, Input, OnChanges, OnInit, SimpleChanges, inject } from '@angular/core';
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
import { RouterModule } from '@angular/router';
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
  @Input() target!: InspectorTarget | undefined;
  targetSubject = new BehaviorSubject<InspectorTarget | undefined>(undefined);

  public comboData!: CollectionCombo<any> | EdgeComboDto | null;
  navigationFollows: 'vertex' | 'edge' = 'vertex';

  propPeopleDisplayedColumns: string[] = ['role', 'name', 'via'];
  titleWidth = 0;

  // Permissions
  hasAdmin = false;
  hasSudo = false;
  hasUpdate = false;
  hasDelete = false;

  ngOnInit(): void {
    this.hasAdmin = this.permission.hasAdmin();

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
        this.comboData = data;
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
      this.hasDelete = this.permission.hasDelete(permissions, targetId);
      this.hasUpdate = this.permission.hasUpdate(permissions, targetId);
      this.hasSudo = this.permission.hasSudo(permissions, targetId);
    });
    window.dispatchEvent(new Event('resize'));
    this.navigationFollows = this.preferences.get('graphFollows');
  }

  ngOnChanges(changes: SimpleChanges) {
    const targetChange = changes['target'];
    if (targetChange && this.target?.id !== targetChange.previousValue?.id) {
      this.comboData = null;
      if (this.target) {
        this.targetSubject.next(this.target);
      }
    }
  }

  getTargetId(): string {
    if (!this.target) {
      return '';
    }
    return this.target.id;
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
    if (!this.target) {
      return;
    }
    if (this.comboData?.type === 'edge') {
      const sourceIndex = this.comboData.edge.is;
      const config = Object.values(this.configArr).find((config) => {
        return config.index === sourceIndex;
      });
      if (config) {
        this.dialog.open(EdgeDialogComponent, {
          width: '500px',
          data: {
            collection: config.collection,
            source: this.comboData.source,
            edge: this.comboData.edge,
          },
        });
      }
    } else if (this.comboData?.type === 'vertex') {
      this.dialog.open(VertexDialogComponent, {
        width: '500px',
        data: {
          collection: this.comboData.vertex.collection,
          data: this.comboData.collection,
          vertex: this.comboData.vertex,
        },
      });
    }
  }

  editTags() {
    if (!this.comboData || !this.target) {
      return;
    }
    if (this.comboData.type === 'vertex') {
      this.dialog
        .open(TagDialogComponent, {
          width: '500px',
          data: {
            collection: this.comboData.vertex.collection,
            collectionData: this.comboData.collection,
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
        if (this.target && result && result.confirm) {
          const obs =
            this.target.type === 'vertex'
              ? this.graphApi.deleteVertex(this.target.id)
              : this.graphApi.deleteEdge(this.target.id);

          obs.subscribe(() => {
            // this.refreshData();
          });
        }
      });
  }

  navigateConnection($event: MouseEvent, item: Connection) {
    const isEdgeNav = this.navigationFollows === 'edge';
    if ($event.altKey ? !isEdgeNav : isEdgeNav) {
      this.selectEdge(item.edge.id);
    } else {
      this.selectVertex(item.vertex.id);
    }
  }

  toggleNavigationFollows() {
    this.navigationFollows =
      this.navigationFollows === 'vertex' ? 'edge' : 'vertex';
    this.preferences.set('graphFollows', this.navigationFollows);
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
    if (!this.target || this.target.type !== 'vertex') {
      return '';
    }
    return this.configMap[this.target.collection].fields[key].type;
  }

  refreshData() {
    if (this.target) {
      this.targetSubject.next(this.target);
    }
  }
}
