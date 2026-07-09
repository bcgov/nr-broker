import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { CollectionConfigDto } from '../../service/persistence/dto/collection-config.dto';
import { CONFIG_ARR } from '../../app-initialize.factory';
import { DetailsItemComponent } from '../../shared/details-item/details-item.component';

export interface BrowseHelpDialogData {
  collection: string;
  config: CollectionConfigDto;
  canFilterConnected: boolean;
}

@Component({
  selector: 'app-browse-help-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatExpansionModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    DetailsItemComponent,
  ],
  templateUrl: './browse-help-dialog.component.html',
  styleUrl: './browse-help-dialog.component.scss',
})
export class BrowseHelpDialogComponent {
  readonly data = inject<BrowseHelpDialogData>(MAT_DIALOG_DATA);
  readonly dialogRef = inject<MatDialogRef<BrowseHelpDialogComponent>>(MatDialogRef);
  readonly configs = inject<CollectionConfigDto[]>(CONFIG_ARR);

  close(): void {
    this.dialogRef.close();
  }
}
