import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

export interface SyncDiagnosticDialogData {
  label: string;
  queue: string;
  summary: string;
  source: 'queue' | 'traverse';
  traverseSummary?: string;
  targetCount: number;
}

@Component({
  selector: 'app-sync-diagnostic-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    MatListModule,
  ],
  templateUrl: './sync-diagnostic-dialog.component.html',
  styleUrl: './sync-diagnostic-dialog.component.scss',
})
export class SyncDiagnosticDialogComponent {
  readonly data = inject<SyncDiagnosticDialogData>(MAT_DIALOG_DATA);
  readonly dialogRef = inject<MatDialogRef<SyncDiagnosticDialogComponent>>(MatDialogRef);

  get targetSummary(): string {
    const count = this.data.targetCount;
    if (count === 0) {
      return 'No targets found. Nothing would be synced.';
    }
    return `${count} target${count === 1 ? '' : 's'} found and would be synced.`;
  }

  close(): void {
    this.dialogRef.close();
  }
}
