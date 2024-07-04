import {
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import {
  BehaviorSubject,
  combineLatest,
  map,
  Observable,
  shareReplay,
  Subject,
  switchMap,
  takeUntil,
  tap,
  startWith,
} from 'rxjs';
import {
  ChartClickTarget,
  ChartClickTargetVertex,
  CollectionConfigMap,
  GraphData,
  GraphDataConfig,
  UserDto,
} from '../service/graph.types';
import { GraphApiService } from '../service/graph-api.service';
import { VertexDialogComponent } from './vertex-dialog/vertex-dialog.component';
import { EchartsComponent } from './echarts/echarts.component';
import { CURRENT_USER } from '../app-initialize.factory';
import { GraphDataResponseDto } from '../service/dto/graph-data.dto';
import {
  CollectionConfigRestDto,
  CollectionEdgeConfig,
} from '../service/dto/collection-config-rest.dto';
import { InspectorComponent } from './inspector/inspector.component';
import { PreferencesService } from '../preferences.service';
import { CommonModule } from '@angular/common';
import { GraphUtilService } from '../service/graph-util.service';
import { GraphEventRestDto } from '../service/dto/graph-event-rest.dto';
import { UserPermissionRestDto } from '../service/dto/user-permission-rest.dto';
import { PermissionService } from '../service/permission.service';

@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss'],
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    CommonModule,
    EchartsComponent,
    InspectorComponent,
  ],
})
export class GraphComponent implements OnInit, OnDestroy {
  @Output() data!: Observable<GraphDataConfig>;
  @Output() selected: ChartClickTarget | undefined = undefined;
  @ViewChild(EchartsComponent)
  private echartsComponent!: EchartsComponent;
  @ViewChild(InspectorComponent)
  private inspectorComponent!: InspectorComponent;

  private triggerRefresh = new BehaviorSubject(true);
  private ngUnsubscribe: Subject<any> = new Subject();
  public latestConfig: CollectionConfigMap | null = null;
  private latestData: GraphData | null = null;

  constructor(
    public readonly permission: PermissionService,
    private readonly dialog: MatDialog,
    private readonly route: ActivatedRoute,
    private readonly graphApi: GraphApiService,
    private readonly preferences: PreferencesService,
    @Inject(CURRENT_USER) public readonly user: UserDto,
    public graphUtil: GraphUtilService,
    private ref: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const cachedData = null;
    this.data = this.triggerRefresh.pipe(
      takeUntil(this.ngUnsubscribe),
      switchMap(() =>
        combineLatest([
          combineLatest([
            this.graphApi.getData(),
            this.graphApi
              .createEventSource()
              .pipe(takeUntil(this.ngUnsubscribe), startWith(null)),
          ]).pipe(
            map(([data, es]) => {
              if (cachedData) {
                data = cachedData;
              }
              if (es === null) {
                return { data, es };
              }
              // console.log(es);

              if (es.event === 'edge-add') {
                data.edges.push(es.edge);
              }
              if (es.event === 'edge-edit') {
                data.edges = data.edges.map((edge) =>
                  edge.id === es.edge.id ? es.edge : edge,
                );
              }
              if (es.event === 'vertex-add') {
                data.vertices.push(es.vertex);
              }
              if (es.event === 'vertex-edit') {
                data.vertices = data.vertices.map((vertex) =>
                  vertex.id === es.vertex.id ? es.vertex : vertex,
                );
              }
              if (es.event === 'edge-delete' || es.event === 'vertex-delete') {
                data.edges = data.edges.filter((edge) => {
                  return es.edge.indexOf(edge.id) === -1;
                });
                data.vertices = data.vertices.filter((vertex) => {
                  return es.vertex.indexOf(vertex.id) === -1;
                });
              }
              return { data, es };
            }),
          ),
          this.graphApi.getConfig(),
          this.graphApi.getUserPermissions(),
        ]),
      ),
      map(
        ([{ data, es }, configArr, permissions]: [
          { data: GraphDataResponseDto; es: GraphEventRestDto | null },
          CollectionConfigRestDto[],
          UserPermissionRestDto,
        ]) => {
          // console.log(data);
          // console.log(config);
          // console.log(permissions);
          const configMap = this.graphUtil.configArrToMap(configArr);
          const configSrcTarMap = this.graphUtil.configArrToSrcTarMap(
            configArr,
            configMap,
          );
          const graphData: GraphData = {
            ...data,
            idToVertex: data.vertices.reduce(
              (previousValue: any, currentValue) => {
                previousValue[currentValue.id] = currentValue;
                return previousValue;
              },
              {},
            ),
            idToEdge: data.edges.reduce((previousValue: any, currentValue) => {
              previousValue[currentValue.id] = currentValue;
              return previousValue;
            }, {}),
          };

          for (const edge of graphData.edges) {
            const targetVertex = graphData.idToVertex[edge.target];
            if (targetVertex) {
              const parentEdgeName =
                configMap[targetVertex.collection]?.parent?.edgeName;
              if (parentEdgeName && edge.name === parentEdgeName) {
                const sourceVertex = graphData.idToVertex[edge.source];
                targetVertex.parentName = sourceVertex.name;
              }
            } else {
              console.log(`Target does not exist in data: ${edge.target}`);
            }
          }
          this.latestConfig = configMap;
          this.latestData = graphData;
          setTimeout(() => this.ref.detectChanges(), 0);
          return {
            data: graphData,
            es,
            config: configMap,
            configSrcTarMap,
            permissions,
          };
        },
      ),
      tap((graphData) => {
        // console.log(graphData.es);
        // console.log(this.selected);
        if (graphData.es === null) {
          return;
        }
        if (this.selected?.type === 'vertex') {
          if (
            (graphData.es.event === 'edge-add' &&
              (graphData.es.edge.source === this.selected.data.id ||
                graphData.es.edge.target === this.selected.data.id)) ||
            (graphData.es.event === 'vertex-edit' &&
              graphData.es.vertex.id === this.selected.data.id) ||
            (graphData.es.event === 'collection-edit' &&
              graphData.es.collection.vertex === this.selected.data.id) ||
            ((graphData.es.event === 'vertex-delete' ||
              graphData.es.event === 'edge-delete') &&
              graphData.es.adjacentVertex.indexOf(this.selected.data.id) !== -1)
          ) {
            this.inspectorComponent.refreshData();
            // console.log('reload!');
          }
        }
        if (this.selected?.type === 'edge') {
          if (
            graphData.es.event === 'edge-edit' &&
            graphData.es.edge.id === this.selected.data.id
          ) {
            this.inspectorComponent.refreshData();
            // console.log('reload!');
          }
        }
      }),
      shareReplay(1),
    );

    combineLatest([this.data, this.route.params]).subscribe(
      ([graphData, params]) => {
        if (params['selected']) {
          const selector = JSON.parse(params['selected']);
          if (selector.type === 'vertex') {
            const vertex = graphData.data.idToVertex[selector.id];
            if (vertex) {
              this.onSelected({
                type: 'vertex',
                data: vertex,
              });
            } else {
              this.onSelected(undefined);
            }
          } else {
            const edge = graphData.data.idToEdge[selector.id];
            if (edge) {
              this.onSelected({
                type: 'edge',
                data: edge,
              });
            } else {
              this.onSelected(undefined);
            }
          }
        } else {
          this.onSelected(undefined);
        }
      },
    );
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next(true);
    this.ngUnsubscribe.complete();
  }

  onSelected(event: ChartClickTarget | undefined): void {
    if (!this.echartsComponent?.echartsInstance) {
      setTimeout(() => this.onSelected(event), 100);
      return;
    }
    const prevSelection = this.selected;
    this.selected = event;
    if (event?.type === 'vertex') {
      this.echartsComponent.echartsInstance.dispatchAction({
        type: 'select',

        // Find  by index or id or name.
        // Can be an array to find multiple components.
        seriesIndex: 0,

        // data index; could assign by name attribute when not defined
        dataIndex: this.latestData?.vertices.findIndex(
          (vertex) =>
            event.data.id === vertex.id &&
            event.data.category === vertex.category,
        ),
      });
    }

    if (
      !prevSelection ||
      !event ||
      event.type !== prevSelection.type ||
      event.data.id !== prevSelection.data.id
    ) {
      this.updateRoute();
    }
  }

  onGraphSelected(event: any): void {
    if (event?.type === 'edge') {
      this.selected = event;
    }
    if (event?.type === 'vertex') {
      this.selected = {
        type: 'vertex',
        data: this.latestData?.vertices.find(
          (vertex) =>
            vertex.id === event.data.name &&
            vertex.category === event.data.category,
        ),
      } as ChartClickTargetVertex;
    }

    this.updateRoute();
  }

  onLegendChanged(event: any): void {
    if (this.latestConfig) {
      const collection = Object.values(this.latestConfig).find(
        (config) => event.name === config.name,
      );
      if (collection) {
        this.preferences.set('graphVertexVisibility', {
          [collection.collection]: event.selected,
        });
      }
    }
  }

  updateRoute() {
    if (this.selected) {
      this.graphUtil.openInGraph(this.selected.data.id, this.selected.type);
    }
  }

  addVertex() {
    this.dialog
      .open(VertexDialogComponent, {
        width: '500px',
        data: {
          configMap: this.latestConfig,
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result && result.refresh) {
          // this.refreshData();
        }
        if (result && result.id) {
          this.graphUtil.openInGraph(result.id, 'vertex');
        }
      });
  }

  resetGraphVisibility() {
    this.preferences.reset([
      'graphVertexVisibility',
      'graphEdgeSrcTarVisibility',
    ]);
  }

  isCollectionVisible(collection: string): boolean {
    if (!this.latestConfig) {
      return false;
    }
    const vertexVisibility = this.preferences.get('graphVertexVisibility');
    return vertexVisibility && vertexVisibility[collection] !== undefined
      ? vertexVisibility[collection]
      : this.latestConfig[collection].show;
  }

  toggleVertex(collection: string) {
    if (!this.latestConfig) {
      return;
    }
    this.preferences.set('graphVertexVisibility', {
      [collection]: !this.isCollectionVisible(collection),
    });
  }

  isEdgeVisible(
    colllectionConfig: CollectionConfigRestDto,
    edge: CollectionEdgeConfig,
  ): boolean {
    if (!this.latestConfig) {
      return false;
    }
    const edgeVisibility = this.preferences.get('graphEdgeSrcTarVisibility');
    const mapString = this.graphUtil.edgeToMapString({
      is: colllectionConfig.index,
      it: this.latestConfig[edge.collection].index,
      name: edge.name,
    });

    return edgeVisibility && edgeVisibility[mapString] !== undefined
      ? edgeVisibility[mapString]
      : edge.show;
  }

  toggleEdge(
    colllectionConfig: CollectionConfigRestDto,
    edge: CollectionEdgeConfig,
  ) {
    if (!this.latestConfig) {
      return;
    }
    const mapString = this.graphUtil.edgeToMapString({
      is: colllectionConfig.index,
      it: this.latestConfig[edge.collection].index,
      name: edge.name,
    });
    this.preferences.set('graphEdgeSrcTarVisibility', {
      [mapString]: !this.isEdgeVisible(colllectionConfig, edge),
    });
  }

  refreshData() {
    this.triggerRefresh.next(true);
  }
}
