import { Component, Input, Output, OnInit, EventEmitter } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { EChartsOption } from 'echarts';
import { NGX_ECHARTS_CONFIG, NgxEchartsModule } from 'ngx-echarts';
import {
  BehaviorSubject,
  map,
  Observable,
  Subject,
  Subscription,
  switchMap,
  takeUntil,
} from 'rxjs';
import { ChartClickTarget, GraphDataConfig } from '../../service/graph.types';
import { GraphUtilService } from '../../service/graph-util.service';
import { PreferencesService } from '../../preferences.service';

@Component({
  selector: 'app-echarts',
  templateUrl: './echarts.component.html',
  styleUrls: ['./echarts.component.scss'],
  standalone: true,
  imports: [NgxEchartsModule, AsyncPipe],
  providers: [
    {
      provide: NGX_ECHARTS_CONFIG,
      useFactory: () => ({ echarts: () => import('echarts') }),
    },
  ],
})
export class EchartsComponent implements OnInit {
  @Input() dataConfig!: Observable<GraphDataConfig>;
  @Output() selected = new EventEmitter<ChartClickTarget>();
  @Output() legendChanged = new EventEmitter<{
    name: string;
    selected: boolean;
  }>();
  options!: Observable<EChartsOption>;
  loading!: boolean;
  echartsInstance: any;
  private triggerRefresh = new BehaviorSubject(true);
  private ngUnsubscribe: Subject<any> = new Subject();
  private prefSubscription!: Subscription;

  constructor(
    private readonly graphUtil: GraphUtilService,
    private readonly preferences: PreferencesService,
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.prefSubscription = this.preferences.onSet.subscribe((pref) => {
      if (
        pref.key === 'graphEdgeSrcTarVisibility' ||
        pref.key === 'graphVertexVisibility'
      ) {
        this.triggerRefresh.next(true);
      }
    });
    this.options = this.triggerRefresh.pipe(
      takeUntil(this.ngUnsubscribe),
      switchMap(() => this.dataConfig),
      map((dataConfig) => {
        const graph = dataConfig.data;
        this.loading = false;
        const graphVertexVisibility = this.preferences.get(
          'graphVertexVisibility',
        );
        const graphEdgeSrcTarVisibility = this.preferences.get(
          'graphEdgeSrcTarVisibility',
        );
        return {
          textStyle: {
            fontStyle: "'BCSans', 'Noto Sans', Verdana, Arial, sans-serif",
          },
          tooltip: {
            formatter: '{c}',
          },
          legend: [
            {
              selected: Object.keys(dataConfig.config).reduce(
                (pv, key) => {
                  pv[dataConfig.config[key].name] =
                    graphVertexVisibility &&
                    graphVertexVisibility[key] !== undefined
                      ? graphVertexVisibility[key]
                      : dataConfig.config[key].show;
                  return pv;
                },
                {} as { [key: string]: boolean },
              ),
              // selectedMode: 'single',
              bottom: 0,
              data: graph.categories.map(function (a: any) {
                return { name: a.name };
              }),
            },
          ],
          animation: true,
          animationDurationUpdate: 1500,
          animationEasingUpdate: 'quinticInOut',
          series: [
            {
              name: 'CMDB',
              type: 'graph',
              categories: graph.categories.map(function (a: any) {
                return { name: a.name };
              }),
              data: graph.vertices.map((e) => {
                return {
                  category: e.category,
                  name: e.id,
                  value: e.name,
                };
              }),
              edges: graph.edges
                .map((e) => {
                  return e;
                })
                .filter((e) => {
                  const edgeMap = this.graphUtil.edgeToMapString(e);
                  const config = dataConfig.configSrcTarMap[edgeMap];
                  if (config) {
                    return graphEdgeSrcTarVisibility &&
                      graphEdgeSrcTarVisibility[edgeMap] !== undefined
                      ? graphEdgeSrcTarVisibility[edgeMap]
                      : config.show;
                  }
                  console.log('Missing edge config ' + edgeMap);
                  return true;
                }),
              emphasis: {
                focus: 'adjacency',
                label: { position: 'right', show: true },
              },
              edgeSymbol: ['none', 'arrow'],
              edgeSymbolSize: 7,
              label: {
                show: true,
                position: 'right',
                formatter: '{c}',
              },
              labelLayout: {
                hideOverlap: false,
              },
              layout: 'force',
              lineStyle: {
                color: 'source',
                curveness: 0,
              },
              roam: true,
              scaleLimit: {
                min: 1,
                max: 5,
              },
              // Disabled because it was selecting everything with same name
              selectedMode: 'single',
              select: {
                itemStyle: {
                  borderColor: '#000',
                  borderWidth: 2,
                },
              },
              tooltip: {
                formatter: '{c}',
              },
              zoom: 2,
            },
          ],
        } as unknown as EChartsOption;
      }),
      // tap((v) => {
      //   console.log(v);
      // }),
    ); // as any;
  }

  onChartClick(event: any) {
    if (event.dataType === 'node') {
      this.selected.emit({
        type: 'vertex',
        data: event.data,
      });
    } else if (event.dataType === 'edge') {
      this.selected.emit({
        type: 'edge',
        data: event.data,
      });
    }
  }

  onChartInit(ec: any) {
    this.echartsInstance = ec;
  }

  onChartLegendSelectChanged(event: any) {
    this.legendChanged.emit({
      name: event.name,
      selected: event.selected[event.name],
    });
  }

  ngOnDestroy() {
    this.prefSubscription.unsubscribe();
    this.ngUnsubscribe.next(true);
    this.ngUnsubscribe.complete();
  }
}
