import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface DeleteConfirmDialogData {
  /** Replaces the default question, which refers to deleting the item */
  message?: string;
}

@Component({
  selector: 'app-delete-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './delete-confirm-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./delete-confirm-dialog.component.scss'],
})
export class DeleteConfirmDialogComponent {
  readonly dialogRef = inject<MatDialogRef<DeleteConfirmDialogComponent>>(MatDialogRef);
  readonly data = inject<DeleteConfirmDialogData | null>(MAT_DIALOG_DATA, { optional: true });

  confirm() {
    this.dialogRef.close({ confirm: true });
  }
}
