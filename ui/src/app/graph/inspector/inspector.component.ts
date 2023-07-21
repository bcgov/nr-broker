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
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import {
  CommonModule,
  AsyncPipe,
  TitleCasePipe,
  KeyValuePipe,
  DatePipe,
} from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import {
  BehaviorSubject,
  map,
  Observable,
  of,
  shareReplay,
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
  EdgeNavigation,
  GraphDataConfig,
  CollectionConfigMap,
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
import { CamelToTitlePipe } from '../camel-to-title.pipe';
import { CollectionFilterPipe } from '../collection-filter.pipe';
import { VertexNameComponent } from '../vertex-name/vertex-name.component';
import { PreferencesService } from '../../preferences.service';
import { InspectorIntentionsComponent } from '../inspector-intentions/inspector-intentions.component';
import { InspectorAccountComponent } from '../inspector-account/inspector-account.component';
import { InspectorInstallsComponent } from '../inspector-installs/inspector-installs.component';

@Component({
  selector: 'app-inspector',
  templateUrl: './inspector.component.html',
  styleUrls: ['./inspector.component.scss'],
  standalone: true,
  imports: [
    AsyncPipe,
    CamelToTitlePipe,
    CollectionFilterPipe,
    CommonModule,
    ClipboardModule,
    DatePipe,
    InspectorAccountComponent,
    InspectorInstallsComponent,
    InspectorIntentionsComponent,
    KeyValuePipe,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatTableModule,
    MatChipsModule,
    TitleCasePipe,
    VertexNameComponent,
  ],
})
export class InspectorComponent implements OnChanges, OnInit {
  @Input() dataConfig!: Observable<GraphDataConfig>;
  @Input() target!: ChartClickTarget | undefined;
  @Output() inboundConnections!: Observable<VertexNavigation | null>;
  @Output() outboundConnections!: Observable<VertexNavigation | null>;
  @Output() edgeConnections!: Observable<EdgeNavigation | null>;
  collectionData: any = null;
  collectionPeople: any = null;
  @Output() selected = new EventEmitter<ChartClickTarget>();
  @Output() graphChanged = new EventEmitter<boolean>();
  propDisplayedColumns: string[] = ['key', 'value'];
  propPeopleDisplayedColumns: string[] = ['role', 'name', 'via'];
  targetSubject = new BehaviorSubject<ChartClickTarget | undefined>(undefined);
  latestData: GraphData | undefined;
  latestConfig: CollectionConfigMap | undefined;
  navigationFollows: 'vertex' | 'edge' = 'vertex';
  titleWidth = 0;

  constructor(
    private graphApi: GraphApiService,
    private dialog: MatDialog,
    private preferences: PreferencesService,
    @Inject(CURRENT_USER) public user: UserDto,
  ) {}

  ngOnInit(): void {
    this.inboundConnections = this.targetSubject.pipe(
      withLatestFrom(this.dataConfig),
      map(([target, dataConfig]) => {
        const data = dataConfig.data;
        if (!target || target.type === 'edge') {
          return null;
        }
        return {
          vertex: target.data,
          direction: 'forward' as ConnectionDirection,
          connections: this.gatherConnections(target, data, 'target'),
        };
      }),
      shareReplay(1),
    );
    this.outboundConnections = this.targetSubject.pipe(
      withLatestFrom(this.dataConfig),
      map(([target, dataConfig]) => {
        const data = dataConfig.data;
        if (!target || target.type === 'edge') {
          return null;
        }
        return {
          vertex: target.data,
          direction: 'forward' as ConnectionDirection,
          connections: this.gatherConnections(target, data, 'source'),
        };
      }),
      shareReplay(1),
    );

    this.edgeConnections = this.targetSubject.pipe(
      withLatestFrom(this.dataConfig),
      map(([target, dataConfig]) => {
        const data = dataConfig.data;
        if (!target || target.type === 'vertex') {
          return null;
        }
        return {
          edge: target.data,
          sourceVertex: data.idToVertex[target.data.source],
          targetVertex: data.idToVertex[target.data.target],
        };
      }),
    );

    this.targetSubject
      .pipe(
        switchMap((target) => {
          return this.getCollectionData(target);
        }),
      )
      .subscribe((data) => {
        this.collectionData = data;
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

    this.dataConfig.subscribe((dataConfig) => {
      this.latestData = dataConfig.data;
      this.latestConfig = dataConfig.config;
    });
    window.dispatchEvent(new Event('resize'));
    this.navigationFollows = this.preferences.get('graphFollows');
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['target']) {
      this.collectionData = null;
      this.target = changes['target'].currentValue;
      if (this.target) {
        this.targetSubject.next(this.target);
      }
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
        if (!this.latestConfig) {
          return connection;
        }
        const configEdges =
          direction === 'reverse'
            ? this.latestConfig[target.data.collection].edges
            : this.latestConfig[
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
    if (this.latestData && this.latestData.idToEdge[id]) {
      const edge = this.latestData.idToEdge[id];
      this.selected.emit({
        type: 'edge',
        data: edge,
      });
    }
    return;
  }

  selectVertex(id: string) {
    if (this.latestData && this.latestData.idToVertex[id]) {
      const vertex = this.latestData.idToVertex[id];
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
    if (!this.latestConfig || !this.collectionData || !this.target) {
      return;
    }
    if (this.target.type === 'edge' && this.latestData) {
      const sourceIndex = this.target.data.is;
      const config = Object.values(this.latestConfig).find((config) => {
        return config.index === sourceIndex;
      });
      this.dialog
        .open(EdgeDialogComponent, {
          width: '500px',
          data: {
            config,
            vertices: this.latestData.vertices,
            vertex: this.latestData.idToVertex[this.target.data.source],
            target: this.target.data,
          },
        })
        .afterClosed()
        .subscribe((result) => {
          if (result && result.refresh) {
            this.graphChanged.emit(true);
          }
        });
    } else if (this.target.type === 'vertex') {
      this.dialog
        .open(VertexDialogComponent, {
          width: '500px',
          data: {
            config: this.latestConfig,
            target: this.target,
            data: this.collectionData,
          },
        })
        .afterClosed()
        .subscribe((result) => {
          if (result && result.refresh) {
            this.graphChanged.emit(true);
          }
        });
    }
  }

  addEdgeToVertex(vertex: GraphDataVertex) {
    if (!this.latestConfig || !this.latestData) {
      return;
    }

    this.dialog
      .open(EdgeDialogComponent, {
        width: '500px',
        data: {
          config: this.latestConfig[vertex.collection],
          vertices: this.latestData.vertices,
          vertex,
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result && result.refresh) {
          this.graphChanged.emit(true);
        }
      });
  }

  openDeleteEdgeDialog(targetConnections: Observable<VertexNavigation | null>) {
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
          this.graphChanged.emit(true);
        }
      });
  }

  deleteTarget() {
    if (!this.target) {
      return;
    }

    const obs =
      this.target.type === 'vertex'
        ? this.graphApi.deleteVertex(this.target.data.id)
        : this.graphApi.deleteEdge(this.target.data.id);

    obs.subscribe(() => {
      this.graphChanged.emit(true);
    });
  }

  navigateConnection(item: Connection) {
    if (this.navigationFollows === 'edge') {
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
    // console.log(target);
    if (!target || target.type !== 'vertex') {
      return of({});
    }
    const vertex = target.data;

    return this.graphApi.getCollectionData(vertex.collection, vertex.id);
  }

  getUpstreamUsers(target: ChartClickTarget | undefined) {
    // console.log(!['service', 'project'].includes((target as any).data.collection));
    if (
      !target ||
      target.type !== 'vertex' ||
      !this.latestConfig ||
      !['service', 'project'].includes(target.data.collection)
    ) {
      return of([]);
    }
    const vertex = target.data;

    return this.graphApi.getUpstream(
      vertex.id,
      this.latestConfig['user'].index,
      ['developer', 'lead-developer'],
    );
  }

  getFieldType(key: string) {
    if (!this.target || !this.latestConfig || this.target.type !== 'vertex') {
      return '';
    }
    return this.latestConfig[this.target.data.collection].fields[key].type;
  }
}
