import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { VaultDialogComponent } from '../vault-dialog/vault-dialog.component';
import { MatButtonModule } from '@angular/material/button';
import {
  MatChipEditedEvent,
  MatChipInputEvent,
  MatChipsModule,
} from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatIconModule } from '@angular/material/icon';
import { CollectionApiService } from '../../service/collection-api.service';
import { CollectionDtoRestUnion } from '../../service/dto/collection-dto-union.type';

@Component({
  selector: 'app-tag-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatChipsModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
  ],
  templateUrl: './tag-dialog.component.html',
  styleUrl: './tag-dialog.component.scss',
})
export class TagDialogComponent {
  addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  public tags: string[] = [];

  constructor(
    public readonly dialogRef: MatDialogRef<VaultDialogComponent>,
    private readonly collectionApi: CollectionApiService,
    @Inject(MAT_DIALOG_DATA)
    private readonly data: {
      collection: keyof CollectionDtoRestUnion;
      collectionData: any;
    },
  ) {}

  ngOnInit() {
    if (this.data.collectionData.tags) {
      this.tags = [...this.data.collectionData.tags];
    }
  }

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    if (value) {
      this.tags.push(value);
    }

    // Clear the input value
    event.chipInput!.clear();
  }

  remove(tag: string): void {
    const index = this.tags.indexOf(tag);

    if (index >= 0) {
      this.tags.splice(index, 1);
    }
  }

  edit(tag: string, event: MatChipEditedEvent) {
    const value = event.value.trim();

    // Remove tag if it no longer
    if (!value) {
      this.remove(tag);
      return;
    }

    // Edit existing tag
    const index = this.tags.indexOf(tag);
    if (index >= 0) {
      this.tags[index] = value;
    }
  }

  update() {
    this.collectionApi
      .setCollectionTags(
        this.data.collection,
        this.data.collectionData.id,
        this.tags,
      )
      .subscribe(() => {
        this.dialogRef.close({
          refresh: true,
        });
      });
  }
}
