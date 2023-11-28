import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { EChartsOption } from 'echarts';

@Component({
  selector: 'app-gantt-graph',
  standalone: true,
  imports: [NgxEchartsModule, CommonModule],
  providers: [
    {
      provide: NGX_ECHARTS_CONFIG,
      useFactory: () => ({ echarts: () => import('echarts') }),
    },
  ],
  templateUrl: './gantt-graph.component.html',
  styleUrl: './gantt-graph.component.scss',
})
export class GanttGraphComponent implements OnInit {
  @Input() data: any;
  options!: EChartsOption;

  ngOnInit(): void {
    this.options = {
      title: {
        text: 'Actions',
        show: false,
      },
      tooltip: {
        appendToBody: true,
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: function (params: any) {
          let tar;
          if (params[1] && params[1].value !== '-') {
            tar = params[1];
          } else {
            tar = params[2];
          }
          return tar && tar.name + '<br/>' + 'Duration : ' + tar.value;
        },
      },
      legend: {
        data: ['Action'],
        show: false,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '3%',
        containLabel: true,
      },
      yAxis: {
        type: 'category',
        data: this.data.actions.map((action: any) => action.action),
      },
      xAxis: {
        type: 'value',
      },
      series: [
        {
          name: 'Placeholder',
          type: 'bar',
          stack: 'Total',
          silent: true,
          itemStyle: {
            borderColor: 'transparent',
            color: 'transparent',
          },
          emphasis: {
            itemStyle: {
              borderColor: 'transparent',
              color: 'transparent',
            },
          },
          data: this.data.actions.map((action: any) =>
            action.start && this.data.transaction.start
              ? new Date(action.start).valueOf() -
                new Date(this.data.transaction.start).valueOf()
              : 0,
          ),
        },
        {
          name: 'Action',
          type: 'bar',
          stack: 'Total',
          label: {
            show: false,
            position: 'bottom',
          },
          data: this.data.actions.map(
            (action: any) => action.trace.duration ?? 0,
          ),
        },
      ],
    };
  }
}
