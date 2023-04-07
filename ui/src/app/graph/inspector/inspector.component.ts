import { HttpClient } from '@angular/common/http';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  BehaviorSubject,
  map,
  Observable,
  of,
  switchMap,
  withLatestFrom,
} from 'rxjs';
import { GraphUtilService } from '../graph-util.service';
import { COLLECTION_CONFIG } from '../graph.constants';
import {
  ChartClickTarget,
  Connection,
  GraphData,
  GraphDataEdgeVertexKeys,
  VertexNavigation,
  ChartClickTargetVertex,
  EdgeNavigation,
} from '../graph.types';
import { environment } from '../../../environments/environment';
import { JsonViewDialogComponent } from '../json-view-dialog/json-view-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-inspector',
  templateUrl: './inspector.component.html',
  styleUrls: ['./inspector.component.scss'],
})
export class InspectorComponent implements OnChanges {
  @Input() data!: Observable<GraphData>;
  @Input() target!: ChartClickTarget | undefined;
  @Output() inboundConnections!: Observable<VertexNavigation | null>;
  @Output() outboundConnections!: Observable<VertexNavigation | null>;
  @Output() edgeConnections!: Observable<EdgeNavigation | null>;
  @Output() collectionData!: Observable<any>;
  @Output() selected = new EventEmitter<ChartClickTarget>();
  propDisplayedColumns: string[] = ['key', 'value'];
  targetSubject = new BehaviorSubject<ChartClickTarget | undefined>(undefined);
  latestData: any;
  navigationFollows: 'vertex' | 'edge' = 'vertex';

  COLLECTION_CONFIG = COLLECTION_CONFIG;

  constructor(
    private http: HttpClient,
    private util: GraphUtilService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.inboundConnections = this.targetSubject.pipe(
      withLatestFrom(this.data),
      map(([target, data]) => {
        if (!target || target.type === 'edge') {
          return null;
        }
        return {
          vertex: target.data,
          direction: 'forward',
          connections: this.gatherConnections(target, data, 'target'),
        };
      }),
    );
    this.outboundConnections = this.targetSubject.pipe(
      withLatestFrom(this.data),
      map(([target, data]) => {
        if (!target || target.type === 'edge') {
          return null;
        }
        return {
          vertex: target.data,
          direction: 'forward',
          connections: this.gatherConnections(target, data, 'source'),
        };
      }),
    );

    this.edgeConnections = this.targetSubject.pipe(
      withLatestFrom(this.data),
      map(([target, data]) => {
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

    this.collectionData = this.targetSubject.pipe(
      switchMap((target) => {
        return this.getCollectionData(target);
      }),
    );
    // this.collectionData.subscribe((data) => {
    //   // console.log(data);
    // });
    this.data.subscribe((data) => {
      this.latestData = data;
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['target']) {
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
    // const reverseDirection: ConnectionDirection = direction === 'forward' ? 'reverse' : 'forward';
    // const reverseDirection: ConnectionDirection = direction === 'forward' ? 'reverse' : 'forward';
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
        const configEdges =
          direction === 'reverse'
            ? this.COLLECTION_CONFIG[target.data.collection].edges
            : this.COLLECTION_CONFIG[
                data.idToVertex[connection.edge.source].collection
              ].edges;
        const config = configEdges.find(
          (config) =>
            config.name === connection.edge.name &&
            config.collection ===
              data.idToVertex[connection.edge.target].collection,
        );
        let parentName;
        if (config && config.inboundName && direction === 'forward') {
          connection.edge.name = config.inboundName;
        }
        if (config && config.namePath) {
          const parentEdges = data.edges.filter(
            (dataEdge) =>
              dataEdge.target ===
                data.idToVertex[connection.edge[invertedVertexKey]].id &&
              dataEdge.name === config.namePath,
          );
          parentName =
            parentEdges.length === 1
              ? data.idToVertex[parentEdges[0].source].name
              : '';
          connection.vertex.parentName = parentName;
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
    // console.log(id);
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
    // console.log(id);
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
      height: '400px',
      width: '600px',
      data: {
        json: JSON.stringify(json, undefined, 4),
      },
    });
  }

  editTarget() {
    console.log('editTarget');
  }

  deleteTarget() {
    console.log('deleteTarget');
  }

  navigateConnection(item: Connection) {
    this.selectVertex(item.vertex.id);
  }

  toggleNavigationFollows() {
    this.navigationFollows =
      this.navigationFollows === 'vertex' ? 'edge' : 'vertex';
  }

  getCollectionData(target: ChartClickTarget | undefined) {
    // console.log(target);
    if (!target || target.type !== 'vertex') {
      return of({});
    }
    const vertex = target.data;

    return this.http.get<any>(
      `${environment.apiUrl}/v1/graph/${this.util.snakecase(
        vertex.collection,
      )}?vertex=${vertex.id}`,
      {
        responseType: 'json',
      },
    );
  }
}
