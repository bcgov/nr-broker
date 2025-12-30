import { Component, ElementRef, output, OnInit, input, inject, OnDestroy, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ECharts, EChartsCoreOption } from 'echarts/core';
import * as echarts from 'echarts/core';
// import necessary echarts components
import { GraphChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
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
import { CONFIG_ARR } from '../../app-initialize.factory';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';

echarts.use([GraphChart, LegendComponent, TooltipComponent, CanvasRenderer]);

@Component({
  selector: 'app-echarts',
  templateUrl: './echarts.component.html',
  styleUrls: ['./echarts.component.scss'],
  imports: [NgxEchartsDirective, AsyncPipe],
  providers: [provideEchartsCore({ echarts })],
})
export class EchartsComponent implements OnInit, OnDestroy {
  private readonly graphUtil = inject(GraphUtilService);
  private readonly preferences = inject(PreferencesService);
  private readonly elRef = inject(ElementRef);
  private readonly configArr = inject(CONFIG_ARR);

  readonly dataConfig = input.required<Observable<GraphDataConfig>>();
  readonly selected = output<ChartClickTarget>();
  readonly legendChanged = output<{
    name: string;
    selected: boolean;
  }>();
  options!: EChartsCoreOption;
  updateOptions!: Observable<EChartsCoreOption>;
  loading = signal(true);
  echartsInstance: ECharts | undefined;
  private triggerRefresh = new BehaviorSubject(true);
  private ngUnsubscribe = new Subject<any>();
  private prefSubscription: Subscription | undefined;

  ngOnInit(): void {
    this.prefSubscription = this.preferences.onSet.subscribe((pref) => {
      if (
        pref.key === 'graphEdgeSrcTarVisibility' ||
        pref.key === 'graphVertexVisibility'
      ) {
        this.triggerRefresh.next(true);
      }
    });
    this.options = {
      color: this.configArr.map((config) => `#${config.color}`),
      textStyle: {
        fontFamily: getComputedStyle(this.elRef.nativeElement).fontFamily,
      },
      tooltip: {
        formatter: '{c}',
      },
      legend: [
        {
          selected: {},
          // selectedMode: 'single',
          bottom: 0,
          data: [],
        },
      ],
      animation: true,
      series: [
        {
          name: 'CMDB',
          type: 'graph',
          categories: [],
          data: [],
          edges: [],
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
    } as EChartsCoreOption;
    this.updateOptions = this.triggerRefresh.pipe(
      takeUntil(this.ngUnsubscribe),
      switchMap(() => this.dataConfig()),
      map((dataConfig) => {
        const graph = dataConfig.data;
        this.loading.set(false);
        const graphVertexVisibility = this.preferences.get(
          'graphVertexVisibility',
        );
        const graphEdgeSrcTarVisibility = this.preferences.get(
          'graphEdgeSrcTarVisibility',
        );
        return {
          legend: [
            {
              selected: Object.keys(dataConfig.config).reduce(
                (pv, key) => {
                  pv[dataConfig.config[key as CollectionNames].name] =
                    graphVertexVisibility &&
                    graphVertexVisibility[key] !== undefined
                      ? graphVertexVisibility[key]
                      : dataConfig.config[key as CollectionNames].show;
                  return pv;
                },
                {} as Record<string, boolean>,
              ),
              data: graph.categories.map(function (a: any) {
                return { name: a.name };
              }),
            },
          ],
          series: [
            {
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
                  if (e.restrict) {
                    e.lineStyle = {
                      type: 'dashed',
                      color: 'source',
                    };
                  }
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
            },
          ],
        } as EChartsCoreOption;
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
    if (this.prefSubscription) {
      this.prefSubscription.unsubscribe();
    }
    this.ngUnsubscribe.next(true);
    this.ngUnsubscribe.complete();
  }
}
