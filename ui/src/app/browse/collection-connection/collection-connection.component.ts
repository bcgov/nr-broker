import { Component, computed, inject, input, numberAttribute } from '@angular/core';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SortDirection } from '@angular/material/sort';
import { httpResource } from '@angular/common/http';
import { CollectionApiService } from '../../service/collection-api.service';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';
import { CollectionHeaderComponent } from '../../shared/collection-header/collection-header.component';
import { CollectionTableComponent, ShowFilter, TableQuery } from '../collection-table/collection-table.component';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { ScreenService } from '../../util/screen.service';
import { PreferencesService } from '../../preferences.service';
import { CollectionUtilService } from '../../service/collection-util.service';
import { CollectionComboDto } from '../../service/persistence/dto/collection-combo.dto';
import { ConnectedTableEdgeInfo } from '../../service/persistence/dto/collection-config.dto';

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
  private readonly collectionUtil = inject(CollectionUtilService);
  private readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);
  private readonly router = inject(Router);
  private readonly preferences = inject(PreferencesService);

  connectedTableCollection = input<CollectionNames>('project');
  connectedTableDirection = input<'upstream' | 'downstream'>('downstream');
  collection = input.required<CollectionNames>();
  collectionId = input.required<string>();

  private readonly config = computed(() => {
    return this.configRecord[this.collection()];
  });

  collectionResource = httpResource<CollectionComboDto<any>>(() => {
    return this.collectionApi.getCollectionComboByIdArgs(this.collection(), this.collectionId());
  });

  edgeOptions = computed<ConnectedTableEdgeInfo[]>(() => {
    const combo = this.collectionResource.value();
    if (!combo) {
      return [];
    }
    return [
      ...(combo.upstream.map((combo) => ({
        collection: combo.vertex.collection,
        restrict: !!combo.edge.restrict,
        direction: 'upstream' as const,
      })) || []),
      ...(combo.downstream.map((combo) => ({
        collection: combo.vertex.collection,
        restrict: !!combo.edge.restrict,
        direction: 'downstream' as const,
      })) || []),
    ];
  });

  connectedTableCollectionOptions = computed(() => {
    return this.collectionUtil.computeConnectedTables(
      this.collection(),
      this.edgeOptions(),
    );
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
  includeRestricted = input(false, {
    transform: (v: boolean | string | undefined) =>
      v === true || v === 'true',
  });

  isUpstreamConnectedCollection(collection: CollectionNames) {
    return (
      this.config()?.connectedTable?.find(
        (c) => c.collection === collection && c.direction === 'upstream',
      ) !== undefined
    );
  }

  updateTableRoute(settings: TableQuery) {
    if (
      this.connectedTableCollection() === settings.collection &&
      this.connectedTableDirection() === settings.direction
    ) {
      this.router.navigate(
        [
          `/browse/${this.collection()}/${this.collectionId()}/connections`,
          {
            connectedTableCollection: settings.collection,
            connectedTableDirection: settings.direction,
            includeRestricted: settings.includeRestricted,
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
            connectedTableDirection: settings.direction,
            includeRestricted: settings.includeRestricted,
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
