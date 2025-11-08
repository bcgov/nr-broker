import { Component, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { InspectorIntentionsComponent } from '../../graph/inspector-intentions/inspector-intentions.component';
import { CollectionHeaderComponent } from '../../shared/collection-header/collection-header.component';
import { ActivatedRoute } from '@angular/router';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';
import { combineLatest } from 'rxjs';
import { CollectionApiService } from '../../service/collection-api.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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
  private readonly activatedRoute = inject(ActivatedRoute);
    private readonly collectionApi = inject(CollectionApiService);

  collection = signal<CollectionNames>('service');
  collectionId = signal('');
  name = signal('');
  loading = signal(true);


  constructor() {
    this.activatedRoute.params.subscribe((params) => {
      this.collectionId.set(params['id']);
      this.collection.set(this.activatedRoute.snapshot.data['collection']);

      combineLatest([
        this.collectionApi.getCollectionById(this.collection(), this.collectionId()),
      ]).subscribe(([service]) => {
        this.name.set(service.name);
        this.loading.set(false);
      });
    });
  }
}
