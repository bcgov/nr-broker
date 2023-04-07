import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InspectorComponent } from './inspector/inspector.component';
import { EchartsComponent } from './echarts/echarts.component';
import { GraphComponent } from './graph.component';
import { NgxEchartsModule } from 'ngx-echarts';
import { MaterialModule } from '../../material.module';
import { CollectionFilterPipe } from './collection-filter.pipe';
import { CamelToTitlePipe } from './camel-to-title.pipe';
import { JsonViewDialogComponent } from './json-view-dialog/json-view-dialog.component';

@NgModule({
  declarations: [
    InspectorComponent,
    EchartsComponent,
    GraphComponent,
    CollectionFilterPipe,
    CamelToTitlePipe,
    JsonViewDialogComponent,
  ],
  imports: [CommonModule, MaterialModule, NgxEchartsModule.forChild()],
  exports: [GraphComponent],
})
export class GraphModule {}
