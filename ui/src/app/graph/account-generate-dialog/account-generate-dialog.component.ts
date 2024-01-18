import { Component, Inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { SystemApiService } from '../../service/system-api.service';

interface ExpiryDay {
  value: string;
  viewValue: string;
}

@Component({
  selector: 'app-account-generate-dialog',
  standalone: true,
  imports: [
    ClipboardModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './account-generate-dialog.component.html',
  styleUrls: ['./account-generate-dialog.component.scss'],
})
export class AccountGenerateDialogComponent {
  token = '';
  selectedPeriod = '7776000';
  expiryList: ExpiryDay[] = [
    { value: '5184000', viewValue: '60 Days' },
    { value: '7776000', viewValue: '90 Days' },
    { value: '31536000', viewValue: '1 year' },
  ];
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
      .generateAccountToken(this.data.accountId, Number(this.selectedPeriod))
      .subscribe((data) => {
        this.token = data.token;
      });
  }

  copyToClipboard() {
    this.clipboard.copy(this.token);
  }
}
