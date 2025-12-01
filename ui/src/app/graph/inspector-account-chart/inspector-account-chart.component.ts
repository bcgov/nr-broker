import { Component, inject, input } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { httpResource } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgxEchartsModule, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
// import necessary echarts components
import { BarChart } from 'echarts/charts';
import {
  LegendComponent,
  GridComponent,
  TooltipComponent,
  TitleComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { EChartsCoreOption } from 'echarts/core';

import { HistogramSeriesDto } from '../../service/collection/dto/histogram-series.dto';
import { BrokerAccountDto } from '../../service/persistence/dto/broker-account.dto';
import { SystemApiService } from '../../service/system-api.service';

// Demo imports
// import { demoData } from './inspector-account-demo';
// import { resource } from '@angular/core';

echarts.use([
  BarChart,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer,
]);

@Component({
  selector: 'app-inspector-account-chart',
  imports: [
    RouterModule,
    NgxEchartsModule,
    MatProgressSpinnerModule,
  ],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './inspector-account-chart.component.html',
  styleUrl: './inspector-account-chart.component.scss',
})
export class InspectorAccountChartComponent {
  private readonly router = inject(Router);
  private readonly systemApi = inject(SystemApiService);

  readonly account = input.required<BrokerAccountDto>();

  readonly accountUsageResource = httpResource<HistogramSeriesDto>(() => {
    return this.systemApi.getAccountUsageArgs(this.account().id);
  });

  // Uncomment to show demo
  // readonly accountUsageResource = resource(({
  //   params: () => ({ id: this.account().id }),
  //   loader: (): Promise<HistogramSeriesDto> => {
  //     return Promise.resolve(demoData);
  //   },
  // }));

  toChartOptions(data: HistogramSeriesDto): EChartsCoreOption {
    return {
      tooltip: { trigger: 'axis' },
      legend: {},
      xAxis: {
        type: 'category',
        data: data.timestamps,
        axisLabel: {
          formatter: (value: string, index: number) => `${index - data.timestamps.length}h`,
        },
      },
      yAxis: { type: 'value' },
      series: Object.entries(data.series).map(([name, data]) => ({
        name,
        type: 'bar',
        stack: 'total',
        data,
      })),
    };
  }
}
