import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface SyncQueueHelpDialogData {
  name: string;
  label: string;
  summary: string;
  description: string[];
}

@Component({
  selector: 'app-sync-queue-help-dialog',
  imports: [MatButtonModule, MatDialogModule],
  templateUrl: './sync-queue-help-dialog.component.html',
  styleUrl: './sync-queue-help-dialog.component.scss',
})
export class SyncQueueHelpDialogComponent {
  readonly data = inject<SyncQueueHelpDialogData>(MAT_DIALOG_DATA);
  readonly dialogRef = inject<MatDialogRef<SyncQueueHelpDialogComponent>>(MatDialogRef);

  close(): void {
    this.dialogRef.close();
  }
}