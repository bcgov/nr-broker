import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { SystemApiService } from '../../service/system-api.service';

@Component({
  selector: 'app-account-generate-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ClipboardModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './account-generate-dialog.component.html',
  styleUrls: ['./account-generate-dialog.component.scss'],
})
export class AccountGenerateDialogComponent {
  token = '';

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
      .generateAccountToken(this.data.accountId)
      .subscribe((data) => {
        this.token = data.token;
      });
  }

  copyToClipboard() {
    this.clipboard.copy(this.token);
  }
}
