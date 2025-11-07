import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SortDirection } from '@angular/material/sort';
import { combineLatest } from 'rxjs';
import { CollectionApiService } from '../../service/collection-api.service';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';
import { BreakpointBaseComponent } from '../../shared/breakpoint-base/breakpoint-base.component';
import { CollectionHeaderComponent } from '../../shared/collection-header/collection-header.component';
import { CollectionTableComponent, ShowFilter } from '../collection-table/collection-table.component';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { CONFIG_RECORD } from '../../app-initialize.factory';

@Component({
  selector: 'app-collection-connection',
  imports: [
    CollectionHeaderComponent,
    CollectionTableComponent,
    MatProgressSpinnerModule,
  ],
  templateUrl: './collection-connection.component.html',
  styleUrl: './collection-connection.component.scss',
})
export class CollectionConnectionComponent extends BreakpointBaseComponent {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly collectionApi = inject(CollectionApiService);
  private readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);

  connectedTableCollection = signal<CollectionNames>('project');

  collection = signal<CollectionNames>('project');
  collectionId = signal<string>('');
  showFilter = signal<ShowFilter>('all');
  index = signal(0);
  size = signal(10);
  sortActive = signal('');
  sortDirection = signal<SortDirection>('');
  readonly config = computed(() => {
    return this.configRecord[this.collection()];
  });
  connectedTableCollectionOptions = computed(() => {
    const collectionOptions = this.config()?.connectedTable;
    if (collectionOptions && collectionOptions[0]) {
      return collectionOptions.map((c) => c.collection);
    } else {
      return [];
    }
  });
  public comboDataResource = httpResource(() => {
    return this.collectionApi.getCollectionComboByIdArgs(
      this.collection(),
      this.collectionId(),
    );
  });

  text = signal('');
  tags = signal('');

  name = signal('');
  vertex = signal('');
  loading = signal(true);

  constructor() {
    super();
    this.activatedRoute.params.subscribe((params) => {
      this.collectionId.set(params['id']);
      this.collection.set(params['collection']);
      this.connectedTableCollection.set(params['connectedTableCollection']);
      combineLatest([
        this.collectionApi.getCollectionById(this.collection(), this.collectionId()),
      ]).subscribe(([collection]) => {
        this.name.set(collection.name);
        this.vertex.set(collection.vertex);
        this.loading.set(false);
      });
    });
  }

  isUpstreamConnectedCollection(collection: CollectionNames) {
    return (
      this.config()?.connectedTable?.find(
        (c) => c.collection === collection && c.direction === 'upstream',
      ) !== undefined
    );
  }

  updateTableRoute($event: any) {
    if (this.connectedTableCollection() === $event.collection) {
      this.text.set($event.text);
      this.tags.set($event.tags.join(','));
      this.index.set($event.index);
      this.size.set($event.size);
      this.sortActive.set($event.sortActive);
      this.sortDirection.set($event.sortDirection);
    } else {
      this.connectedTableCollection.set($event.collection);
      this.text.set('');
      this.tags.set('');
      this.index.set(0);
      this.size.set($event.size);
      this.sortActive.set('');
      this.sortDirection.set('');
    }
    console.log($event);
  }
}
