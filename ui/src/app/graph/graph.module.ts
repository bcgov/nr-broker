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
import { AddEdgeDialogComponent } from './add-edge-dialog/add-edge-dialog.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { VertexDialogComponent } from './vertex-dialog/vertex-dialog.component';
import { VertexFormFieldComponent } from './vertex-form-field/vertex-form-field.component';
import { VertexFormBuilderComponent } from './vertex-form-builder/vertex-form-builder.component';
import { VertexNameComponent } from './vertex-name/vertex-name.component';

@NgModule({
  declarations: [
    InspectorComponent,
    EchartsComponent,
    GraphComponent,
    CollectionFilterPipe,
    CamelToTitlePipe,
    JsonViewDialogComponent,
    AddEdgeDialogComponent,
    VertexDialogComponent,
    VertexFormFieldComponent,
    VertexFormBuilderComponent,
    VertexNameComponent,
  ],
  imports: [
    CommonModule,
    MaterialModule,
    NgxEchartsModule.forChild(),
    FormsModule,
    ReactiveFormsModule,
  ],
  exports: [GraphComponent],
})
export class GraphModule {}
