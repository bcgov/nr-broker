import { Component, inject } from '@angular/core';
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
  imports: [MatDialogModule, MatButtonModule],
})
export class JsonViewDialogComponent {
  readonly data = inject<{
    json: any;
  }>(MAT_DIALOG_DATA);
  readonly dialogRef = inject<MatDialogRef<JsonViewDialogComponent>>(MatDialogRef);

  closeDialog() {
    this.dialogRef.close();
  }
}
