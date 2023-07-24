import { Component, Inject, Output, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
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
  of,
  delay,
} from 'rxjs';
import {
  ChartClickTarget,
  ChartClickTargetVertex,
  CollectionConfigMap,
  CollectionEdgeConfigMap,
  GraphData,
  GraphDataConfig,
  UserDto,
} from '../service/graph.types';
import { GraphApiService } from '../service/graph-api.service';
import { VertexDialogComponent } from './vertex-dialog/vertex-dialog.component';
import { EchartsComponent } from './echarts/echarts.component';
import { CURRENT_USER } from '../app-initialize.factory';
import { GraphDataResponseDto } from '../service/dto/graph-data.dto';
import { CollectionConfigResponseDto } from '../service/dto/collection-config-rest.dto';
import { InspectorComponent } from './inspector/inspector.component';
import { PreferencesService } from '../preferences.service';

@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss'],
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    EchartsComponent,
    InspectorComponent,
  ],
})
export class GraphComponent {
  @Output() data!: Observable<GraphDataConfig>;
  @Output() selected: ChartClickTarget | undefined = undefined;
  @ViewChild(EchartsComponent)
  private echartsComponent!: EchartsComponent;

  private triggerRefresh = new BehaviorSubject(true);
  private ngUnsubscribe: Subject<any> = new Subject();
  private latestConfig: CollectionConfigMap | null = null;
  private latestData: GraphData | null = null;

  constructor(
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router,
    private graphApi: GraphApiService,
    private preferences: PreferencesService,
    @Inject(CURRENT_USER) public user: UserDto,
  ) {}

  ngOnInit(): void {
    this.data = this.triggerRefresh.pipe(
      takeUntil(this.ngUnsubscribe),
      switchMap(() =>
        combineLatest([this.graphApi.getData(), this.graphApi.getConfig()]),
      ),
      map(
        ([data, configArr]: [
          GraphDataResponseDto,
          CollectionConfigResponseDto[],
        ]) => {
          // console.log(data);
          // console.log(config);
          const configMap: CollectionConfigMap = configArr.reduce(
            (previousValue, currentValue) => {
              previousValue[currentValue.collection] = currentValue;
              return previousValue;
            },
            {} as CollectionConfigMap,
          );
          const configSrcTarMap: CollectionEdgeConfigMap = configArr.reduce(
            (previousValue, currentValue, currentIndex) => {
              for (const edge of currentValue.edges) {
                previousValue[
                  `${currentIndex}>${configMap[edge.collection].index}:${
                    edge.name
                  }`
                ] = edge;
              }
              return previousValue;
            },
            {} as CollectionEdgeConfigMap,
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
            const parentEdgeName =
              configMap[targetVertex.collection]?.parent?.edgeName;
            if (parentEdgeName && edge.name === parentEdgeName) {
              const sourceVertex = graphData.idToVertex[edge.source];
              targetVertex.parentName = sourceVertex.name;
            }
          }
          this.latestConfig = configMap;
          this.latestData = graphData;

          return {
            data: graphData,
            config: configMap,
            configSrcTarMap,
          };
        },
      ),
      tap((graphData) => {
        of(this.route.snapshot.params)
          .pipe(delay(100))
          .subscribe((params) => {
            if (params['selected']) {
              const selector = JSON.parse(params['selected']);
              if (selector.type === 'vertex') {
                const vertex = graphData.data.idToVertex[selector.id];
                if (vertex) {
                  this.onSelected({
                    type: 'vertex',
                    data: vertex,
                  });
                }
              } else {
                const edge = graphData.data.idToEdge[selector.id];
                if (edge) {
                  this.onSelected({
                    type: 'edge',
                    data: edge,
                  });
                }
              }
            } else {
              this.onSelected(undefined);
            }
          });
      }),
      shareReplay(1),
    );
  }

  onSelected(event: ChartClickTarget | undefined): void {
    if (!this.echartsComponent.echartsInstance) {
      setTimeout(() => this.onSelected(event), 100);
      return;
    }
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

    this.updateRoute();
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
          ...(this.preferences.get('graphVertexVisibility') ?? {}),
          [collection.collection]: event.selected,
        });
      }
    }
  }

  updateRoute() {
    if (this.selected) {
      this.router.navigate(
        [
          '/graph',
          {
            selected: JSON.stringify({
              id: this.selected.data.id,
              type: this.selected.type,
            }),
          },
        ],
        {
          replaceUrl: true,
        },
      );
    }
  }

  addVertex() {
    this.dialog
      .open(VertexDialogComponent, {
        width: '500px',
        data: {
          config: this.latestConfig,
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result && result.refresh) {
          this.refreshData();
        }
      });
  }

  showMenu() {
    const currentValue = this.preferences.get('graphVertexVisibility')[
      'environment'
    ];
    this.preferences.set('graphVertexVisibility', {
      environment: !currentValue,
    });
  }

  refreshData() {
    this.triggerRefresh.next(true);
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next(true);
    this.ngUnsubscribe.complete();
  }
}
