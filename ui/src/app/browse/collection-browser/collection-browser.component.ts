import {
  Component,
  effect,
  Inject,
  input,
  numberAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { SortDirection } from '@angular/material/sort';
import { of, switchMap } from 'rxjs';

import { CollectionApiService } from '../../service/collection-api.service';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';
import { CollectionConfigDto } from '../../service/persistence/dto/collection-config.dto';
import { VertexDialogComponent } from '../../graph/vertex-dialog/vertex-dialog.component';
import { PermissionService } from '../../service/permission.service';
import { AddTeamDialogComponent } from '../../team/add-team-dialog/add-team-dialog.component';
import { PreferencesService } from '../../preferences.service';
import {
  CollectionTableComponent,
  TableQuery,
  ShowFilter,
} from '../collection-table/collection-table.component';
import { CONFIG_ARR, CONFIG_RECORD } from '../../app-initialize.factory';
import { CollectionConfigNameRecord } from '../../service/graph.types';

interface filterOptions<T> {
  value: T;
  viewValue: string;
  tooltip: string;
}

@Component({
  selector: 'app-collection-browser',
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
    RouterModule,
    CollectionTableComponent,
  ],
  templateUrl: './collection-browser.component.html',
  styleUrl: './collection-browser.component.scss',
})
export class CollectionBrowserComponent {
  collection = input<CollectionNames>('project');
  currentCollection!: CollectionNames;

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

  disableAdd = true;

  config: CollectionConfigDto[] | undefined;
  collectionFilterOptions: filterOptions<CollectionNames>[] = [];

  constructor(
    public readonly permission: PermissionService,
    @Inject(CONFIG_ARR) public readonly configArr: CollectionConfigDto[],
    @Inject(CONFIG_RECORD)
    public readonly configRecord: CollectionConfigNameRecord,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly collectionApi: CollectionApiService,
    private readonly preferences: PreferencesService,
  ) {
    this.config = this.configArr.filter((config) => config.permissions.browse);
    this.collectionFilterOptions = this.config.map((config) => {
      return {
        value: config.collection,
        viewValue: config.name,
        tooltip: config.hint,
      };
    });

    effect(() => {
      this.currentCollection = this.collection();
      if (!this.config) {
        return;
      }
      const config = this.config.find(
        (config) => config.collection === this.currentCollection,
      );

      if (!config) {
        return;
      }
      this.disableAdd = !config.permissions.create;
    });
  }

  onCollectionChange() {
    this.updateRoute({
      collection: this.currentCollection,
      index: 0,
      size: 10,
      sortActive: '',
      sortDirection: '',
      showFilter: 'all',
      tags: [],
      text: '',
      refresh: 1,
    });

    this.preferences.set('browseCollectionDefault', this.currentCollection);
  }

  updateRoute(settings: TableQuery) {
    if (settings.showFilter) {
      this.preferences.set('browseConnectionFilter', settings.showFilter);
    }
    this.router.navigate(
      [
        `/browse/${settings.collection}`,
        {
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
  }

  addVertex() {
    const dialogClass: any =
      this.currentCollection === 'team'
        ? AddTeamDialogComponent
        : VertexDialogComponent;

    this.dialog
      .open(dialogClass, {
        width: '500px',
        data: {
          configMap: {
            [this.currentCollection]: this.config?.find(
              (config) => config.collection === this.currentCollection,
            ),
          },
          collection: this.currentCollection,
        },
      })
      .afterClosed()
      .pipe(
        switchMap((result) => {
          if (result && result.id) {
            return this.collectionApi.searchCollection(this.currentCollection, {
              vertexId: result.id,
              offset: 0,
              limit: 1,
            });
          }
          return of(null);
        }),
      )
      .subscribe((result) => {
        if (result) {
          this.router.navigate(
            ['/browse', this.currentCollection, result.data[0].collection.id],
            {
              replaceUrl: true,
            },
          );
        }
      });
  }
}
