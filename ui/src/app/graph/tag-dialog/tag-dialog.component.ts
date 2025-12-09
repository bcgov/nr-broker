import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import {
  MatChipEditedEvent,
  MatChipInputEvent,
  MatChipsModule,
} from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatIconModule } from '@angular/material/icon';
import { CollectionApiService } from '../../service/collection-api.service';
import { CollectionDtoUnion } from '../../service/persistence/dto/collection-dto-union.type';

@Component({
  selector: 'app-tag-dialog',
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
export class TagDialogComponent implements OnInit {
  readonly dialogRef = inject<MatDialogRef<TagDialogComponent>>(MatDialogRef);
  private readonly collectionApi = inject(CollectionApiService);
  private readonly data = inject<{
    collection: keyof CollectionDtoUnion;
    collectionData: any;
  }>(MAT_DIALOG_DATA);

  addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  public tags = signal<string[]>([]);

  ngOnInit() {
    if (this.data.collectionData.tags) {
      this.tags.set([...this.data.collectionData.tags]);
    }
  }

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    if (value) {
      this.tags.set([...this.tags(), value]);
    }

    // Clear the input value
    event.chipInput!.clear();
  }

  remove(tag: string): void {
    const tags = this.tags();
    const index = tags.indexOf(tag);

    if (index >= 0) {
      tags.splice(index, 1);
      this.tags.set(tags);
    }
  }

  edit(tag: string, event: MatChipEditedEvent) {
    const value = event.value.trim();

    // Remove tag if trims to nothing
    if (!value) {
      this.remove(tag);
      return;
    }

    // Edit existing tag
    const tags = this.tags();
    const index = tags.indexOf(tag);
    if (index >= 0) {
      tags[index] = value;
      this.tags.set(tags);
    }
  }

  update() {
    this.collectionApi
      .setCollectionTags(
        this.data.collection,
        this.data.collectionData.id,
        this.tags(),
      )
      .subscribe(() => {
        this.dialogRef.close({
          refresh: true,
        });
      });
  }
}
