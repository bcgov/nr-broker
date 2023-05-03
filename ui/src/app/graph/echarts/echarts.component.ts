import { Component, Input, Output, OnInit, EventEmitter } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { EChartsOption } from 'echarts';
import { NGX_ECHARTS_CONFIG, NgxEchartsModule } from 'ngx-echarts';
import { map, Observable } from 'rxjs';
import { ChartClickTarget, GraphDataConfig } from '../graph.types';

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
  options!: Observable<EChartsOption>;
  loading!: boolean;
  echartsInstance: any;

  ngOnInit(): void {
    this.loading = true;
    this.options = this.dataConfig.pipe(
      map((dataConfig) => {
        const graph = dataConfig.data;
        this.loading = false;
        return {
          tooltip: {
            formatter: '{c}',
          },
          legend: [
            {
              // selectedMode: 'single',
              bottom: 0,
              data: graph.categories.map(function (a: any) {
                return a.name;
              }),
            },
          ],
          animation: true,
          animationdurationupdate: 1500,
          animationEasingUpdate: 'quinticInOut',
          series: [
            {
              name: 'CMDB',
              type: 'graph',
              data: graph.vertices.map((e) => {
                return {
                  category: e.category,
                  name: e.id,
                  value: e.name,
                };
              }),
              edges: graph.edges.map((e: any) => {
                return e;
              }),
              emphasis: {
                focus: 'adjacency',
                label: { position: 'right', show: true },
              },
              categories: graph.categories,
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
        };
      }),
    );
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
}
