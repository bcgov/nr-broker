import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { SystemApiService } from '../../service/system-api.service';

interface ExpiryDay {
  value: number;
  viewValue: string;
}

@Component({
  selector: 'app-account-generate-dialog',
  imports: [
    ClipboardModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './account-generate-dialog.component.html',
  styleUrls: ['./account-generate-dialog.component.scss'],
})
export class AccountGenerateDialogComponent {
  token = '';
  selectedPeriod = 7776000;
  expiryList: ExpiryDay[] = [
    { value: 5184000, viewValue: '60 days' },
    { value: 7776000, viewValue: '90 days' },
    { value: 31536000, viewValue: '1 year' },
  ];
  patchVaultTools = true;
  syncGithub = true;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public readonly data: {
      accountId: string;
    },
    private readonly clipboard: Clipboard,
    private readonly systemApi: SystemApiService,
  ) {}

  generate() {
    this.systemApi
      .generateAccountToken(
        this.data.accountId,
        this.selectedPeriod,
        this.patchVaultTools,
        this.syncGithub && this.patchVaultTools,
      )
      .subscribe((data) => {
        this.token = data.token;
      });
  }

  copyToClipboard() {
    this.clipboard.copy(this.token);
  }
}
