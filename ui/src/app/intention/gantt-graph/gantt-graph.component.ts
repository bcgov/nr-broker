import { Component, ElementRef, Input, OnInit, inject } from '@angular/core';

import { NgxEchartsModule, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
// import necessary echarts components
import { BarChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { EChartsCoreOption } from 'echarts/core';
import prettyMilliseconds from 'pretty-ms';

echarts.use([
  BarChart,
  GridComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer,
]);

@Component({
  selector: 'app-gantt-graph',
  imports: [NgxEchartsModule],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './gantt-graph.component.html',
  styleUrl: './gantt-graph.component.scss',
})
export class GanttGraphComponent implements OnInit {
  private readonly elRef = inject(ElementRef);

  @Input() intention: any;
  @Input() action?: any;
  options!: EChartsCoreOption;

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
          formatter: (value: number | bigint) => {
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
