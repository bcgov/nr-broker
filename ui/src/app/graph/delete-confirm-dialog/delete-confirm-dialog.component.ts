import { Component } from '@angular/core';

import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-delete-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './delete-confirm-dialog.component.html',
  styleUrls: ['./delete-confirm-dialog.component.scss'],
})
export class DeleteConfirmDialogComponent {
  constructor(
    public readonly dialogRef: MatDialogRef<DeleteConfirmDialogComponent>,
  ) {}

  confirm() {
    this.dialogRef.close({ confirm: true });
  }
}
