import { Component, Input, Output, OnInit, EventEmitter } from '@angular/core';
import { EChartsOption } from 'echarts';
import { map, Observable } from 'rxjs';
import { ChartClickTarget, GraphDataConfig } from '../graph.types';

@Component({
  selector: 'app-echarts',
  templateUrl: './echarts.component.html',
  styleUrls: ['./echarts.component.scss'],
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
              layout: 'force',
              data: graph.vertices.map((e) => {
                // console.log(e);
                return {
                  category: e.category,
                  name: e.id,
                  value: e.name,
                };
              }),
              edges: graph.edges.map((e: any) => {
                // console.log(e);
                return e;
              }),
              emphasis: {
                focus: 'adjacency',
                label: { position: 'right', show: true },
              },
              roam: true,
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
              scaleLimit: {
                min: 0.4,
                max: 8,
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
              lineStyle: {
                color: 'source',
                curveness: 0,
              },
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
