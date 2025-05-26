import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
import { VertexPointerDto } from '../../service/persistence/dto/vertex-pointer.dto';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';

@Component({
  selector: 'app-vertex-tags',
  imports: [CommonModule, RouterModule, MatChipsModule],
  templateUrl: './vertex-tags.component.html',
  styleUrl: './vertex-tags.component.scss',
})
export class VertexTagsComponent {
  private readonly configRecord = inject(CONFIG_RECORD);
  private readonly router = inject(Router);

  readonly collection = input.required<CollectionNames>();
  readonly collectionData = input.required<VertexPointerDto>();
  readonly collectionTags = computed(() => {
    const data = this.collectionData();
    return data.tags ? data.tags : [];
  });
  readonly config = computed(() => {
    return this.configRecord[this.collection()];
  });

  browseTag(tag: string) {
    this.router.navigate([`/browse/${this.collection()}`, { tags: [tag] }]);
  }
}
