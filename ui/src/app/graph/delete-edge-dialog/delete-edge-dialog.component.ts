import { Component, Inject, OnInit, ViewChild } from '@angular/core';
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
import { Observable } from 'rxjs';
import { GraphApiService } from '../../service/graph-api.service';
import { CamelToTitlePipe } from '../camel-to-title.pipe';
import { VertexNameComponent } from '../vertex-name/vertex-name.component';
import { VertexNavigation } from '../../service/graph.types';

@Component({
  selector: 'app-delete-edge-dialog',
  templateUrl: './delete-edge-dialog.component.html',
  styleUrls: ['./delete-edge-dialog.component.scss'],
  standalone: true,
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatOptionModule,
    MatListModule,
    VertexNameComponent,
    MatButtonModule,
    CamelToTitlePipe,
    CommonModule,
  ],
})
export class DeleteEdgeDialogComponent implements OnInit {
  @ViewChild(MatSelectionList) private selectionComponent!: MatSelectionList;
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      connections: Observable<VertexNavigation>;
    },
    public dialogRef: MatDialogRef<DeleteEdgeDialogComponent>,
    private graphApi: GraphApiService,
  ) {}

  ngOnInit(): void {
    console.log(this.data);
  }

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
