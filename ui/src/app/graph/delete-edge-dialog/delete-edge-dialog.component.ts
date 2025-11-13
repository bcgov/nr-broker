import { Component, ViewChild, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatListModule, MatSelectionList } from '@angular/material/list';
import { GraphApiService } from '../../service/graph-api.service';
import { ConnectionMap } from '../../service/graph.types';

@Component({
  selector: 'app-delete-edge-dialog',
  templateUrl: './delete-edge-dialog.component.html',
  styleUrls: ['./delete-edge-dialog.component.scss'],
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatOptionModule,
    MatListModule,
    MatButtonModule,
    CommonModule,
  ],
})
export class DeleteEdgeDialogComponent {
  readonly data = inject<{
    connections: ConnectionMap;
  }>(MAT_DIALOG_DATA);
  readonly dialogRef = inject<MatDialogRef<DeleteEdgeDialogComponent>>(MatDialogRef);
  private readonly graphApi = inject(GraphApiService);

  @ViewChild(MatSelectionList) private selectionComponent!: MatSelectionList;

  deleteEdge() {
    const edges = this.selectionComponent.selectedOptions.selected;
    edges.forEach((element) => {
      this.graphApi.deleteEdge(element.value.edge.id).subscribe(() => {
        this.dialogRef.close({ refresh: true });
      });
    });
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
