import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-account-revoke-dialog',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './account-revoke-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./account-revoke-dialog.component.scss'],
})
export class AccountRevokeDialogComponent {
  readonly dialogRef = inject<MatDialogRef<AccountRevokeDialogComponent>>(MatDialogRef);

  confirm() {
    this.dialogRef.close({ confirm: true });
  }
}
