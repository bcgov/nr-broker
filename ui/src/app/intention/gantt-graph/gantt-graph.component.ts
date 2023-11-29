import { Component, ElementRef, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import prettyMilliseconds from 'pretty-ms';

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

  constructor(private readonly elRef: ElementRef) {}

  ngOnInit(): void {
    this.options = {
      title: {
        text: 'Actions',
        show: false,
      },
      textStyle: {
        fontFamily: getComputedStyle(this.elRef.nativeElement).fontFamily,
      },
      tooltip: {
        appendToBody: true,
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: function (params: any) {
          const tar = params[1];
          return `<b>${tar && tar.name}</b><br/>${
            tar.axisValue
          }<br/>Duration : ${prettyMilliseconds(tar.value)}`;
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
        axisLabel: {
          formatter: (value) => {
            return prettyMilliseconds(value);
          },
        },
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
          data: this.data.actions.map((action: any) => ({
            name: action.service.name,
            value: action.trace.duration ?? 0,
          })),
        },
      ],
    };
  }
}
