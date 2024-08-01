import { Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
  ReplaySubject,
} from 'rxjs';
import {
  ChartClickTarget,
  CollectionConfigMap,
  GraphData,
  GraphDataConfig,
  InspectorTarget,
  UserDto,
} from '../service/graph.types';
import { GraphApiService } from '../service/graph-api.service';
import { VertexDialogComponent } from './vertex-dialog/vertex-dialog.component';
import { EchartsComponent } from './echarts/echarts.component';
import {
  CONFIG_ARR,
  CONFIG_MAP,
  CURRENT_USER,
} from '../app-initialize.factory';
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
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss'],
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    CommonModule,
    EchartsComponent,
    InspectorComponent,
  ],
})
export class GraphComponent implements OnInit, OnDestroy {
  public data!: Observable<GraphDataConfig>;
  public selected: InspectorTarget | undefined = undefined;
  public showFilter: 'connected' | 'all' =
    this.preferences.get('browseConnectionFilter') ?? 'connected';
  private showFilter$ = new ReplaySubject<'connected' | 'all'>(1);

  @ViewChild(EchartsComponent)
  private echartsComponent!: EchartsComponent;
  @ViewChild(InspectorComponent)
  private inspectorComponent!: InspectorComponent;

  private triggerRefresh = new BehaviorSubject(true);
  private ngUnsubscribe: Subject<any> = new Subject();
  private latestData: GraphData | null = null;

  constructor(
    public readonly permission: PermissionService,
    public readonly graphUtil: GraphUtilService,
    @Inject(CURRENT_USER) public readonly user: UserDto,
    @Inject(CONFIG_ARR) public readonly configArr: CollectionConfigRestDto[],
    @Inject(CONFIG_MAP) public readonly configMap: CollectionConfigMap,
    private readonly dialog: MatDialog,
    private readonly route: ActivatedRoute,
    private readonly graphApi: GraphApiService,
    private readonly preferences: PreferencesService,
  ) {}

  ngOnInit(): void {
    this.data = this.triggerRefresh.pipe(
      takeUntil(this.ngUnsubscribe),
      switchMap(() =>
        combineLatest([
          combineLatest([
            this.graphApi.getData(),
            this.graphApi.getVertexConnected(),
            this.graphApi
              .createEventSource()
              .pipe(takeUntil(this.ngUnsubscribe), startWith(null)),
          ]).pipe(
            map(([data, connected, es]) => {
              // This map alters data based on the events
              // Since there is only one copy of data, this means later calls recieve the
              // altered data object (not the original one)
              if (es === null) {
                return { data, connected, es };
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
              return { data, connected, es };
            }),
          ),
          this.showFilter$,
          this.graphApi.getUserPermissions(),
        ]),
      ),
      map(
        ([{ data, connected, es }, showFilter, permissions]: [
          {
            data: GraphDataResponseDto;
            connected: string[];
            es: GraphEventRestDto | null;
          },
          showFilter: 'connected' | 'all',
          UserPermissionRestDto,
        ]) => {
          // console.log(data);
          // console.log(config);
          // console.log(permissions);
          // console.log(connected);
          // console.log(showFilter);

          // Clone data so filter doesn't change object
          data = {
            edges: [...data.edges],
            vertices: [...data.vertices],
            categories: [...data.categories],
          } as GraphDataResponseDto;
          if (showFilter === 'connected') {
            data.vertices = data.vertices.filter(
              (vertex) => connected.indexOf(vertex.id) !== -1,
            );
            data.edges = data.edges.filter(
              (edge) => connected.indexOf(edge.target) !== -1,
            );
          }
          const configSrcTarMap = GraphUtilService.configArrToSrcTarMap(
            this.configArr,
            this.configMap,
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
                this.configMap[targetVertex.collection]?.parent?.edgeName;
              if (parentEdgeName && edge.name === parentEdgeName) {
                const sourceVertex = graphData.idToVertex[edge.source];
                targetVertex.parentName = sourceVertex.name;
              }
            } else {
              console.log(`Target does not exist in data: ${edge.target}`);
            }
          }
          this.latestData = graphData;
          //setTimeout(() => this.ref.detectChanges(), 0);
          return {
            data: graphData,
            es,
            config: this.configMap,
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
              (graphData.es.edge.source === this.selected.id ||
                graphData.es.edge.target === this.selected.id)) ||
            (graphData.es.event === 'vertex-edit' &&
              graphData.es.vertex.id === this.selected.id) ||
            (graphData.es.event === 'collection-edit' &&
              graphData.es.collection.vertex === this.selected.id) ||
            ((graphData.es.event === 'vertex-delete' ||
              graphData.es.event === 'edge-delete') &&
              graphData.es.adjacentVertex.indexOf(this.selected.id) !== -1)
          ) {
            this.inspectorComponent.refreshData();
            // console.log('reload!');
          }
        }
        if (this.selected?.type === 'edge') {
          if (
            graphData.es.event === 'edge-edit' &&
            graphData.es.edge.id === this.selected.id
          ) {
            this.inspectorComponent.refreshData();
            // console.log('reload!');
          }
        }
      }),
      shareReplay(1),
    );

    this.route.params.subscribe((params) => {
      if (params['selected']) {
        const selector = JSON.parse(params['selected']);
        if (selector.type === 'vertex') {
          if (this.selected?.id === selector.id) {
            return;
          }
          this.graphApi.getVertex(selector.id).subscribe((vertex) => {
            this.onSelected({
              type: 'vertex',
              id: vertex.id,
              collection: vertex.collection,
            });
          });
        } else {
          this.graphApi.getEdge(selector.id).subscribe((edge) => {
            this.onSelected({
              type: 'edge',
              id: edge.id,
              source: edge.source,
              target: edge.target,
            });
          });
        }
      } else {
        this.onSelected(undefined);
      }
    });

    this.showFilter$.next(this.showFilter);
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next(true);
    this.ngUnsubscribe.complete();
  }

  onChartSelected(event: ChartClickTarget | undefined): void {
    if (event?.type === 'vertex') {
      this.graphApi.getVertex(event.data.name).subscribe((vertex) => {
        this.onSelected({
          type: 'vertex',
          id: vertex.id,
          collection: vertex.collection,
          data: vertex,
        });
      });
    }
    if (event?.type === 'edge') {
      this.onSelected({
        type: 'edge',
        id: event.data.id,
        source: event.data.source,
        target: event.data.target,
      });
    }
  }

  onSelected(event: InspectorTarget | undefined, dispatch = true): void {
    if (!this.echartsComponent?.echartsInstance) {
      setTimeout(() => this.onSelected(event, dispatch), 100);
      return;
    }
    const prevSelection = this.selected;
    if (event?.type === 'vertex') {
      this.selected = event;
      const dataIndex = this.latestData?.vertices.findIndex(
        (vertex) => event.id === vertex.id,
      );
      if (dispatch && dataIndex !== -1) {
        this.echartsComponent.echartsInstance.dispatchAction({
          type: 'select',

          // Find  by index or id or name.
          // Can be an array to find multiple components.
          seriesIndex: 0,

          // data index; could assign by name attribute when not defined
          dataIndex,
        });
      }
    }

    if (event?.type === 'edge') {
      this.selected = event;
    }

    if (
      !prevSelection ||
      !event ||
      event.type !== prevSelection.type ||
      event.id !== prevSelection.id
    ) {
      this.updateRoute();
    }
  }

  onLegendChanged(event: any): void {
    if (this.configMap) {
      const collection = Object.values(this.configMap).find(
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
      this.graphUtil.openInGraph(this.selected.id, this.selected.type);
    }
  }

  addVertex() {
    this.dialog
      .open(VertexDialogComponent, {
        width: '500px',
        data: {
          configMap: this.configMap,
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
    if (!this.configMap) {
      return false;
    }
    const vertexVisibility = this.preferences.get('graphVertexVisibility');
    return vertexVisibility && vertexVisibility[collection] !== undefined
      ? vertexVisibility[collection]
      : this.configMap[collection].show;
  }

  toggleVertex(collection: string) {
    if (!this.configMap) {
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
    if (!this.configMap) {
      return false;
    }
    const edgeVisibility = this.preferences.get('graphEdgeSrcTarVisibility');
    const mapString = this.graphUtil.edgeToMapString({
      is: colllectionConfig.index,
      it: this.configMap[edge.collection].index,
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
    if (!this.configMap) {
      return;
    }
    const mapString = this.graphUtil.edgeToMapString({
      is: colllectionConfig.index,
      it: this.configMap[edge.collection].index,
      name: edge.name,
    });
    this.preferences.set('graphEdgeSrcTarVisibility', {
      [mapString]: !this.isEdgeVisible(colllectionConfig, edge),
    });
  }

  refreshData() {
    this.triggerRefresh.next(true);
  }

  toggleFilter() {
    this.showFilter = this.showFilter === 'all' ? 'connected' : 'all';
    this.preferences.set('browseConnectionFilter', this.showFilter);
    this.showFilter$.next(this.showFilter);
  }
}
