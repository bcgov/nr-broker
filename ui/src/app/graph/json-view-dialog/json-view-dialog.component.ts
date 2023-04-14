import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-json-view-dialog',
  templateUrl: './json-view-dialog.component.html',
  styleUrls: ['./json-view-dialog.component.scss'],
})
export class JsonViewDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { json: any },
    public dialogRef: MatDialogRef<JsonViewDialogComponent>,
  ) {}

  closeDialog() {
    this.dialogRef.close();
  }
}
