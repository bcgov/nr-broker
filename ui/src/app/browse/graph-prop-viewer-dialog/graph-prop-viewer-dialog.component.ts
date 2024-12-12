import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { InspectorPropertiesComponent } from '../../graph/inspector-properties/inspector-properties.component';
import { VertexPropDto } from '../../service/dto/vertex.dto';
import { EdgePropDto } from '../../service/dto/edge-prop.dto';

@Component({
  selector: 'app-graph-prop-viewer-dialog',
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    InspectorPropertiesComponent,
  ],
  templateUrl: './graph-prop-viewer-dialog.component.html',
  styleUrl: './graph-prop-viewer-dialog.component.scss',
})
export class GraphPropViewerDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public readonly data: {
      prop: VertexPropDto | EdgePropDto;
    },
    public readonly dialogRef: MatDialogRef<GraphPropViewerDialogComponent>,
  ) {}
}
