import { Component, Inject } from '@angular/core';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-json-view-dialog',
    templateUrl: './json-view-dialog.component.html',
    styleUrls: ['./json-view-dialog.component.scss'],
    imports: [MatDialogModule, MatButtonModule]
})
export class JsonViewDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: { json: any },
    public readonly dialogRef: MatDialogRef<JsonViewDialogComponent>,
  ) {}

  closeDialog() {
    this.dialogRef.close();
  }
}
