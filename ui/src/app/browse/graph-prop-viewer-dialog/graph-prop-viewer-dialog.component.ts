import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { InspectorPropertiesComponent } from '../../graph/inspector-properties/inspector-properties.component';
import { VertexPropDto } from '../../service/persistence/dto/vertex.dto';
import { EdgePropDto } from '../../service/persistence/dto/edge-prop.dto';

@Component({
  selector: 'app-graph-prop-viewer-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    InspectorPropertiesComponent,
  ],
  templateUrl: './graph-prop-viewer-dialog.component.html',
  styleUrl: './graph-prop-viewer-dialog.component.scss',
})
export class GraphPropViewerDialogComponent {
  readonly data = inject<{
    prop: VertexPropDto | EdgePropDto;
  }>(MAT_DIALOG_DATA);
  readonly dialogRef = inject<MatDialogRef<GraphPropViewerDialogComponent>>(MatDialogRef);
}
