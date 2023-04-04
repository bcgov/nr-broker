import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InspectorComponent } from './inspector/inspector.component';
import { EchartsComponent } from './echarts/echarts.component';
import { GraphComponent } from './graph.component';
import { NgxEchartsModule } from 'ngx-echarts';
import { MaterialModule } from '../../material.module';

@NgModule({
  declarations: [InspectorComponent, EchartsComponent, GraphComponent],
  imports: [CommonModule, MaterialModule, NgxEchartsModule.forChild()],
  exports: [GraphComponent],
})
export class GraphModule {}
