import { Component, Inject } from '@angular/core';

import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-inspector-service-secure-dialog',
    imports: [
        ClipboardModule,
        FormsModule,
        MatButtonModule,
        MatDialogModule,
        MatIconModule,
        MatListModule,
        MatSlideToggleModule,
        MatTooltipModule,
    ],
    templateUrl: './inspector-service-secure-dialog.component.html',
    styleUrl: './inspector-service-secure-dialog.component.scss'
})
export class InspectorServiceSecureDialogComponent {
  reveal = false;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public readonly data: any,
    public readonly dialogRef: MatDialogRef<InspectorServiceSecureDialogComponent>,
  ) {}
}
