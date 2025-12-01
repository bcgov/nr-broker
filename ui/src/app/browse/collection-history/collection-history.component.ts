import { Component, inject, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InspectorIntentionsComponent } from '../../graph/inspector-intentions/inspector-intentions.component';
import { CollectionHeaderComponent } from '../../shared/collection-header/collection-header.component';
import { CollectionNames, CollectionValues } from '../../service/persistence/dto/collection-dto-union.type';
import { CollectionApiService } from '../../service/collection-api.service';
import { httpResource } from '@angular/common/http';

@Component({
  selector: 'app-collection-history',
  imports: [
    MatCardModule,
    MatProgressSpinnerModule,
    InspectorIntentionsComponent,
    CollectionHeaderComponent,
  ],
  templateUrl: './collection-history.component.html',
  styleUrl: './collection-history.component.scss',
})
export class CollectionHistoryComponent {
  private readonly collectionApi = inject(CollectionApiService);

  collection = input.required<CollectionNames>();
  collectionId = input.required<string>();
  collectionResource = httpResource<CollectionValues>(() => {
    return this.collectionApi.getCollectionByIdArgs(this.collection(), this.collectionId());
  });
}
