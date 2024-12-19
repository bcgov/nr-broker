import { Component, ElementRef, Input, OnInit } from '@angular/core';

import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import prettyMilliseconds from 'pretty-ms';

@Component({
  selector: 'app-gantt-graph',
  imports: [NgxEchartsModule],
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
  @Input() intention: any;
  @Input() action?: any;
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
        data: this.action
          ? [this.action.action]
          : this.intention.actions.map((action: any) => action.action),
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
          data: this.action
            ? [
                this.action.trace.start && this.intention.transaction.start
                  ? new Date(this.action.trace.start).valueOf() -
                    new Date(this.intention.transaction.start).valueOf()
                  : 0,
              ]
            : this.intention.actions.map((action: any) =>
                action.trace.start && this.intention.transaction.start
                  ? new Date(action.trace.start).valueOf() -
                    new Date(this.intention.transaction.start).valueOf()
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
          data: this.action
            ? [
                {
                  name: this.action.service.name,
                  value: this.action.trace.duration ?? 0,
                },
              ]
            : this.intention.actions.map((action: any) => ({
                name: action.service.name,
                value: action.trace.duration ?? 0,
              })),
        },
        {
          name: 'Placeholder2',
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
          data: this.action
            ? [
                this.action.trace.end && this.intention.transaction.end
                  ? new Date(this.intention.transaction.end).valueOf() -
                    new Date(this.action.trace.end).valueOf()
                  : 0,
              ]
            : this.intention.actions.map((action: any) =>
                action.trace.end && this.intention.transaction.end
                  ? new Date(this.intention.transaction.end).valueOf() -
                    new Date(action.trace.end).valueOf()
                  : 0,
              ),
        },
      ],
    };
  }
}
