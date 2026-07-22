import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CollectionConfigDto } from '../../service/persistence/dto/collection-config.dto';
import { DetailsItemComponent } from '../../shared/details-item/details-item.component';

export interface CollectionDetailsDialogData {
  collection: string;
  configs: CollectionConfigDto[];
}

@Component({
  selector: 'app-collection-details-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    DetailsItemComponent,
  ],
  templateUrl: './collection-details-dialog.component.html',
  styleUrl: './collection-details-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class CollectionDetailsDialogComponent {
  readonly data = inject<CollectionDetailsDialogData>(MAT_DIALOG_DATA);
  readonly dialogRef = inject<MatDialogRef<CollectionDetailsDialogComponent>>(MatDialogRef);

  close(): void {
    this.dialogRef.close();
  }
}
