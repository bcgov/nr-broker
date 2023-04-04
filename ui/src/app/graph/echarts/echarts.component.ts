import { Component, Input, Output, OnInit, EventEmitter } from '@angular/core';
import { EChartsOption } from 'echarts';
import { map, Observable } from 'rxjs';

@Component({
  selector: 'app-echarts',
  templateUrl: './echarts.component.html',
  styleUrls: ['./echarts.component.scss'],
})
export class EchartsComponent implements OnInit {
  @Input() data!: Observable<any>;
  @Output() selected = new EventEmitter<any>();
  options!: Observable<EChartsOption>;
  loading!: boolean;

  ngOnInit(): void {
    // console.log(this.data);
    this.loading = true;
    this.options = this.data.pipe(
      map((graph) => {
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
              data: graph.nodes, // links: graph.links,
              edges: graph.links.map((e: any) => {
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
        id: event.data.id,
        dataType: 'vertex',
        type: event.data.type,
        name: event.data.name,
        prop: event.data.prop,
      });
    } else if (event.dataType === 'edge') {
      this.selected.emit({
        id: event.data.id,
        dataType: 'edge',
        label: event.data.label,
        prop: event.data.prop,
        source: event.data.source,
        target: event.data.target,
      });
    }
  }
}
