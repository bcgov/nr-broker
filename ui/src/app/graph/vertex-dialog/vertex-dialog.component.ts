import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CollectionConfig } from '../graph.types';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-vertex-dialog',
  templateUrl: './vertex-dialog.component.html',
  styleUrls: ['./vertex-dialog.component.scss'],
})
export class VertexDialogComponent {
  collectionControl = new FormControl<string | CollectionConfig>('');

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { config: CollectionConfig[] },
    public dialogRef: MatDialogRef<VertexDialogComponent>,
  ) {}

  closeDialog() {
    this.dialogRef.close();
  }
}
