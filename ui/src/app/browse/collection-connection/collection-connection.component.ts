import { Component, computed, inject, input, numberAttribute } from '@angular/core';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SortDirection } from '@angular/material/sort';
import { CollectionApiService } from '../../service/collection-api.service';
import { CollectionNames, CollectionValues } from '../../service/persistence/dto/collection-dto-union.type';
import { CollectionHeaderComponent } from '../../shared/collection-header/collection-header.component';
import { CollectionTableComponent, ShowFilter, TableQuery } from '../collection-table/collection-table.component';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { ScreenService } from '../../util/screen.service';
import { PreferencesService } from '../../preferences.service';
import { httpResource } from '@angular/common/http';

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
export class CollectionConnectionComponent {
  readonly screen = inject(ScreenService);
  private readonly collectionApi = inject(CollectionApiService);
  private readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);
  private readonly router = inject(Router);
  private readonly preferences = inject(PreferencesService);

  connectedTableCollection = input<CollectionNames>('project');
  collection = input.required<CollectionNames>();
  collectionId = input.required<string>();

  private readonly config = computed(() => {
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

  collectionResource = httpResource<CollectionValues>(() => {
    return this.collectionApi.getCollectionByIdArgs(this.collection(), this.collectionId());
  });

  text = input('', { transform: (v: string | undefined) => v ?? '' });
  tags = input('');
  showFilter = input(
    this.preferences.get('browseConnectionFilter') ?? 'connected',
    {
      transform: (v: ShowFilter | undefined) =>
        v ?? this.preferences.get('browseConnectionFilter') ?? 'connected',
    },
  );
  index = input(0, { transform: (v) => numberAttribute(v, 0) });
  size = input(10, { transform: (v) => numberAttribute(v, 10) });
  sortActive = input('');
  sortDirection = input<SortDirection>('');

  isUpstreamConnectedCollection(collection: CollectionNames) {
    return (
      this.config()?.connectedTable?.find(
        (c) => c.collection === collection && c.direction === 'upstream',
      ) !== undefined
    );
  }

  updateTableRoute(settings: TableQuery) {
    if (this.connectedTableCollection() === settings.collection) {
      this.router.navigate(
        [
          `/browse/${this.collection()}/${this.collectionId()}/connections`,
          {
            connectedTableCollection: settings.collection,
            text: settings.text,
            index: settings.index,
            size: settings.size,
            ...(settings.sortActive ? { sortActive: settings.sortActive } : {}),
            ...(settings.sortDirection
              ? { sortDirection: settings.sortDirection }
              : {}),
            ...(settings.showFilter ? { showFilter: settings.showFilter } : {}),
            tags: settings.tags,
          },
        ],
        {
          replaceUrl: true,
        },
      );
    } else {
      this.router.navigate(
        [
          `/browse/${this.collection()}/${this.collectionId()}/connections`,
          {
            connectedTableCollection: settings.collection,
            text: '',
            index: 0,
            size: 10,
            sortActive: '',
            sortDirection: '',
            showFilter: 'all',
            tags: [],
            refresh: 1,
          },
        ],
        {
          replaceUrl: true,
        },
      );
    }
  }
}
