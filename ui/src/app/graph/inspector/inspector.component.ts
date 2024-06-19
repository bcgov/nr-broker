import {
  ChangeDetectorRef,
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
  combineLatest,
  map,
  of,
  ReplaySubject,
  switchMap,
  withLatestFrom,
} from 'rxjs';
import {
  ChartClickTarget,
  Connection,
  GraphData,
  GraphDataEdgeVertexKeys,
  VertexNavigation,
  ChartClickTargetVertex,
  GraphDataConfig,
  GraphDataVertex,
  ConnectionDirection,
  UserDto,
} from '../../service/graph.types';
import { JsonViewDialogComponent } from '../json-view-dialog/json-view-dialog.component';
import { GraphApiService } from '../../service/graph-api.service';
import { EdgeDialogComponent } from '../edge-dialog/edge-dialog.component';
import { DeleteEdgeDialogComponent } from '../delete-edge-dialog/delete-edge-dialog.component';
import { VertexDialogComponent } from '../vertex-dialog/vertex-dialog.component';
import { CURRENT_USER } from '../../app-initialize.factory';
import { PreferencesService } from '../../preferences.service';
import { DeleteConfirmDialogComponent } from '../delete-confirm-dialog/delete-confirm-dialog.component';
import { InspectorEdgeComponent } from '../inspector-edge/inspector-edge.component';
import { InspectorVertexComponent } from '../inspector-vertex/inspector-vertex.component';
import { TagDialogComponent } from '../tag-dialog/tag-dialog.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-inspector',
  templateUrl: './inspector.component.html',
  styleUrls: ['./inspector.component.scss'],
  standalone: true,
  imports: [
    AsyncPipe,
    ClipboardModule,
    InspectorEdgeComponent,
    InspectorVertexComponent,
    KeyValuePipe,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatTableModule,
    MatChipsModule,
    RouterModule,
    TagDialogComponent,
    TitleCasePipe,
  ],
})
export class InspectorComponent implements OnChanges, OnInit {
  @Input() dataConfig!: GraphDataConfig | null;
  dataConfig$ = new ReplaySubject<GraphDataConfig>(1);
  @Input() target!: ChartClickTarget | undefined;
  inboundConnections!: VertexNavigation | null;
  outboundConnections!: VertexNavigation | null;
  collectionData: any = null;
  collectionPeople: any = null;
  @Output() selected = new EventEmitter<ChartClickTarget>();
  propDisplayedColumns: string[] = ['key', 'value'];
  propPeopleDisplayedColumns: string[] = ['role', 'name', 'via'];
  targetSubject = new BehaviorSubject<ChartClickTarget | undefined>(undefined);
  navigationFollows: 'vertex' | 'edge' = 'vertex';
  titleWidth = 0;
  hasSudo = false;
  hasUpdate = false;
  hasDelete = false;

  constructor(
    private readonly graphApi: GraphApiService,
    private readonly dialog: MatDialog,
    private readonly preferences: PreferencesService,
    @Inject(CURRENT_USER) public readonly user: UserDto,
    private ref: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    combineLatest([this.targetSubject, this.dataConfig$])
      .pipe(
        map(([target, dataConfig]) => {
          if (!target || !dataConfig || target.type === 'edge') {
            return null;
          }
          const data = dataConfig.data;
          return {
            vertex: target.data,
            direction: 'forward' as ConnectionDirection,
            connections: this.gatherConnections(target, data, 'target'),
          };
        }),
      )
      .subscribe((inboundConnections) => {
        this.inboundConnections = inboundConnections;
      });
    combineLatest([this.targetSubject, this.dataConfig$])
      .pipe(
        map(([target, dataConfig]) => {
          if (!target || !dataConfig || target.type === 'edge') {
            return null;
          }
          const data = dataConfig.data;
          return {
            vertex: target.data,
            direction: 'forward' as ConnectionDirection,
            connections: this.gatherConnections(target, data, 'source'),
          };
        }),
      )
      .subscribe((outboundConnections) => {
        this.outboundConnections = outboundConnections;
      });

    this.targetSubject
      .pipe(
        switchMap((target) => {
          return this.getCollectionData(target);
        }),
      )
      .subscribe((data) => {
        this.collectionData = data;
        setTimeout(() => this.ref.detectChanges(), 100);

        // console.log('reloaded!');
      });

    this.targetSubject
      .pipe(
        switchMap((target) => {
          return this.getUpstreamUsers(target);
        }),
      )
      .subscribe((data) => {
        this.collectionPeople = data;
      });

    this.targetSubject
      .pipe(withLatestFrom(this.dataConfig$))
      .subscribe(([target, dataConfig]) => {
        if (!target || !dataConfig) {
          return;
        }
        const targetId =
          target.type === 'edge' ? target.data.target : target.data.id;
        this.hasDelete = dataConfig.permissions.delete.indexOf(targetId) !== -1;
        this.hasUpdate = dataConfig.permissions.update.indexOf(targetId) !== -1;
        this.hasSudo = dataConfig.permissions.sudo.indexOf(targetId) !== -1;
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
      this.collectionData = null;
      if (this.target) {
        this.targetSubject.next(this.target);
      }
    }

    if (changes['dataConfig']) {
      this.dataConfig$.next(changes['dataConfig'].currentValue);
    }
  }

  gatherConnections(
    target: ChartClickTargetVertex,
    data: GraphData,
    edgeKey: GraphDataEdgeVertexKeys,
  ): { [key: string]: Connection[] } {
    const invertedVertexKey = edgeKey === 'target' ? 'source' : 'target';
    const direction = edgeKey === 'target' ? 'forward' : 'reverse';
    return data.edges
      .filter((edge) => {
        const edgeId = edgeKey === 'target' ? edge.target : edge.source;
        return edgeId === target.data.id;
      })
      .map((edge) => {
        const vertex = data.idToVertex[edge[invertedVertexKey]];
        return {
          edge: {
            ...edge,
          },
          direction,
          vertex: {
            ...vertex,
          },
        };
      })
      .map((connection) => {
        if (!this.dataConfig?.config) {
          return connection;
        }
        const configEdges =
          direction === 'reverse'
            ? this.dataConfig.config[target.data.collection].edges
            : this.dataConfig.config[
                data.idToVertex[connection.edge.source].collection
              ].edges;
        const config = configEdges.find(
          (config) =>
            config.name === connection.edge.name &&
            config.collection ===
              data.idToVertex[connection.edge.target].collection,
        );
        if (config && config.inboundName && direction === 'forward') {
          connection.edge.name = config.inboundName;
        }
        return connection;
      })
      .reduce((previousValue: any, currentValue: any) => {
        if (!previousValue[currentValue.edge.name]) {
          previousValue[currentValue.edge.name] = [];
        }
        previousValue[currentValue.edge.name].push(currentValue);
        return previousValue;
      }, {});
  }

  getTargetId(): string {
    if (!this.target) {
      return '';
    }
    return this.target.data.id;
  }

  getEdgeSourceId(): string {
    if (this.target && this.target.type === 'edge') {
      return this.target.data.source;
    }
    return '';
  }

  getEdgeTargetId(): string {
    if (this.target && this.target.type === 'edge') {
      return this.target.data.target;
    }
    return '';
  }

  selectEdge(id: string) {
    if (this.dataConfig?.data && this.dataConfig.data.idToEdge[id]) {
      const edge = this.dataConfig.data.idToEdge[id];
      this.selected.emit({
        type: 'edge',
        data: edge,
      });
    }
    return;
  }

  selectVertex(id: string) {
    if (this.dataConfig?.data && this.dataConfig.data.idToVertex[id]) {
      const vertex = this.dataConfig.data.idToVertex[id];
      this.selected.emit({
        type: 'vertex',
        data: vertex,
      });
    }
  }

  viewCollectionJson(json: any) {
    this.dialog.open(JsonViewDialogComponent, {
      width: '500px',
      data: {
        json: JSON.stringify(json, undefined, 4),
      },
    });
  }

  editTarget() {
    if (!this.dataConfig?.config || !this.collectionData || !this.target) {
      return;
    }
    if (this.target.type === 'edge' && this.dataConfig?.data) {
      const sourceIndex = this.target.data.is;
      const config = Object.values(this.dataConfig.config).find((config) => {
        return config.index === sourceIndex;
      });
      if (config) {
        this.dialog
          .open(EdgeDialogComponent, {
            width: '500px',
            data: {
              collection: config.collection,
              config: this.dataConfig.config,
              vertices: this.dataConfig.data.vertices,
              vertex: this.dataConfig.data.idToVertex[this.target.data.source],
              target: this.target.data,
            },
          })
          .afterClosed()
          .subscribe((result) => {
            if (result && result.refresh) {
              // this.refreshData();
            }
          });
      }
    } else if (this.target.type === 'vertex') {
      this.dialog
        .open(VertexDialogComponent, {
          width: '500px',
          data: {
            configMap: this.dataConfig.config,
            collection: this.target.data.collection,
            vertexId: this.target.data.id,
            data: this.collectionData,
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
    if (!this.dataConfig?.config || !this.collectionData || !this.target) {
      return;
    }
    if (this.target.type === 'vertex' && this.dataConfig?.data) {
      // const targetId = ;
      // const collection = this.target.data.collection;
      this.dialog
        .open(TagDialogComponent, {
          width: '500px',
          data: {
            collection: this.target.data.collection,
            collectionData: this.collectionData,
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
    if (!this.dataConfig?.config || !this.dataConfig?.data) {
      return;
    }

    this.dialog
      .open(EdgeDialogComponent, {
        width: '500px',
        data: {
          collection: vertex.collection,
          config: this.dataConfig.config,
          vertices: this.dataConfig.data.vertices,
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

  getCollectionData(target: ChartClickTarget | undefined) {
    if (!target || target.type !== 'vertex') {
      return of({});
    }
    const vertex = target.data;

    return this.graphApi.getCollectionData(vertex.collection, vertex.id);
  }

  getUpstreamUsers(target: ChartClickTarget | undefined) {
    // console.log(!['service', 'project'].includes((target as any).data.collection));
    const mapCollectionToEdgeName: { [key: string]: string[] } = {
      service: ['developer', 'lead-developer'],
      project: ['developer', 'lead-developer'],
      brokerAccount: ['administrator', 'lead-developer'],
    };
    if (
      !target ||
      target.type !== 'vertex' ||
      !this.dataConfig?.config ||
      !Object.keys(mapCollectionToEdgeName).includes(target.data.collection)
    ) {
      return of([]);
    }
    const vertex = target.data;

    return this.graphApi.getUpstream(
      vertex.id,
      this.dataConfig.config['user'].index,
      mapCollectionToEdgeName[target.data.collection],
    );
  }

  getFieldType(key: string) {
    if (
      !this.target ||
      !this.dataConfig?.config ||
      this.target.type !== 'vertex'
    ) {
      return '';
    }
    return this.dataConfig.config[this.target.data.collection].fields[key].type;
  }

  refreshData() {
    if (this.target) {
      this.targetSubject.next(this.target);
    }
  }
}
