import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { AsyncPipe, TitleCasePipe, KeyValuePipe } from '@angular/common';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  map,
  of,
  switchMap,
} from 'rxjs';
import {
  ChartClickTarget,
  Connection,
  VertexNavigation,
  GraphDataVertex,
  UserDto,
  CollectionConfigMap,
  ChartClickTargetEdge,
  ChartClickTargetVertex,
} from '../../service/graph.types';
import { GraphApiService } from '../../service/graph-api.service';
import { DeleteEdgeDialogComponent } from '../delete-edge-dialog/delete-edge-dialog.component';
import {
  CONFIG_ARR,
  CONFIG_MAP,
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
import { CollectionConfigRestDto } from '../../service/dto/collection-config-rest.dto';
import { EdgeDialogComponent } from '../edge-dialog/edge-dialog.component';
import { CollectionCombo } from '../../service/dto/collection-search-result.dto';
import { EdgeComboRestDto } from '../../service/dto/edge-combo-rest.dto';
import { InspectorPropertiesComponent } from '../inspector-properties/inspector-properties.component';
import { InspectorTimestampsComponent } from '../inspector-timestamps/inspector-timestamps.component';
import { GraphUtilService } from '../../service/graph-util.service';
import { EdgeRestDto } from '../../service/dto/edge-rest.dto';
import { VertexRestDto } from '../../service/dto/vertex-rest.dto';

@Component({
  selector: 'app-inspector',
  templateUrl: './inspector.component.html',
  styleUrls: ['./inspector.component.scss'],
  standalone: true,
  imports: [
    AsyncPipe,
    ClipboardModule,
    KeyValuePipe,
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
    TagDialogComponent,
    TitleCasePipe,
  ],
})
export class InspectorComponent implements OnChanges, OnInit {
  @Input() target!: ChartClickTarget | undefined;
  targetSubject = new BehaviorSubject<ChartClickTarget | undefined>(undefined);
  @Output() selected = new EventEmitter<ChartClickTarget>();

  public comboData!: CollectionCombo<any> | EdgeComboRestDto | null;
  navigationFollows: 'vertex' | 'edge' = 'vertex';

  propPeopleDisplayedColumns: string[] = ['role', 'name', 'via'];
  titleWidth = 0;

  // Permissions
  hasAdmin = false;
  hasSudo = false;
  hasUpdate = false;
  hasDelete = false;

  constructor(
    private readonly permission: PermissionService,
    private readonly graphApi: GraphApiService,
    private readonly collectionApi: CollectionApiService,
    private readonly dialog: MatDialog,
    private readonly preferences: PreferencesService,
    private readonly graphUtil: GraphUtilService,
    @Inject(CURRENT_USER) public readonly user: UserDto,
    @Inject(CONFIG_ARR) public readonly configArr: CollectionConfigRestDto[],
    @Inject(CONFIG_MAP) public readonly configMap: CollectionConfigMap,
  ) {}

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
      const targetId =
        target.type === 'edge' ? target.data.target : target.data.id;
      this.hasDelete = this.permission.hasDelete(permissions, targetId);
      this.hasUpdate = this.permission.hasUpdate(permissions, targetId);
      this.hasSudo = this.permission.hasSudo(permissions, targetId);
    });
    window.dispatchEvent(new Event('resize'));
    this.navigationFollows = this.preferences.get('graphFollows');
  }

  ngOnChanges(changes: SimpleChanges) {
    const targetChange = changes['target'];
    if (
      targetChange &&
      this.target?.data.id !== targetChange.previousValue?.data?.id
    ) {
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
    return this.target.data.id;
  }

  selectEdge(id: string) {
    // console.log(`selectEdge: ${id}`);
    this.graphUtil.openInGraph(id, 'edge');
  }

  selectVertex(id: string) {
    // console.log(`selectVertex: ${id}`);
    this.graphUtil.openInGraph(id, 'vertex');
  }

  navigate(target: EdgeRestDto | VertexRestDto) {
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
        this.dialog
          .open(EdgeDialogComponent, {
            width: '500px',
            data: {
              collection: config.collection,
              source: this.comboData.source,
              edge: this.comboData.edge,
            },
          })
          .afterClosed()
          .subscribe((result) => {
            if (result && result.refresh) {
              // this.refreshData();
            }
          });
      }
    } else if (this.comboData?.type === 'vertex') {
      this.dialog
        .open(VertexDialogComponent, {
          width: '500px',
          data: {
            configMap: {
              [this.comboData.vertex.collection]:
                this.configMap[this.comboData.vertex.collection],
            },
            collection: this.comboData.vertex.collection,
            vertexId: this.comboData.vertex.id,
            data: this.comboData.collection,
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
              ? this.graphApi.deleteVertex(this.target.data.id)
              : this.graphApi.deleteEdge(this.target.data.id);

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

  getVertexTargetData(target: ChartClickTargetVertex) {
    if (target.type === 'vertex') {
      const vertex = target.data;

      return this.collectionApi
        .searchCollection(vertex.collection, {
          vertexId: vertex.id,
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

  getEdgeTargetData(
    target: ChartClickTargetEdge,
  ): Observable<EdgeComboRestDto> {
    return combineLatest({
      edge: this.graphApi.getEdge(target.data.id),
      source: this.graphApi.getVertex(target.data.source),
      target: this.graphApi.getVertex(target.data.target),
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
    return this.configMap[this.target.data.collection].fields[key].type;
  }

  refreshData() {
    if (this.target) {
      this.targetSubject.next(this.target);
    }
  }
}
