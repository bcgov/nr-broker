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

  ngOnInit(): void {
    this.loading = true;
    this.options = this.dataConfig.pipe(
      map((dataConfig) => {
        const graph = dataConfig.data;
        this.loading = false;
        return {
          tooltip: {},
          legend: [
            {
              // selectedMode: 'single',
              data: graph.categories.map(function (a: any) {
                return a.name;
              }),
            },
          ],
          series: [
            {
              name: 'CMDB',
              type: 'graph',
              layout: 'force',
              data: graph.vertices, // links: graph.links,
              edges: graph.edges.map((e: any) => {
                // console.log(e);
                return e;
              }),
              roam: true,
              categories: graph.categories,
              edgeSymbol: ['none', 'arrow'],
              edgeSymbolSize: 5,
              label: {
                show: true,
                position: 'right',
                formatter: '{b}',
              },
              labelLayout: {
                hideOverlap: false,
              },
              scaleLimit: {
                min: 0.4,
                max: 8,
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
}
