import { Component, effect, inject, numberAttribute, input, output, computed, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  MatSort,
  MatSortModule,
  SortDirection,
  Sort,
} from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import {
  Subject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

import { CollectionApiService } from '../../service/collection-api.service';
import {
  CONFIG_ARR,
  CONFIG_RECORD,
  CURRENT_USER,
} from '../../app-initialize.factory';
import { GraphUtilService } from '../../service/graph-util.service';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';
import {
  CollectionFieldConfigMap,
  ConnectedTableOptions,
} from '../../service/persistence/dto/collection-config.dto';
import { CollectionCombo } from '../../service/collection/dto/collection-search-result.dto';
import { CollectionComboDto } from '../../service/persistence/dto/collection-combo.dto';
import { InspectorVertexFieldComponent } from '../../graph/inspector-vertex-field/inspector-vertex-field.component';
import { InspectorTeamComponent } from '../../graph/inspector-team/inspector-team.component';
import { InspectorPeopleDialogComponent } from '../../graph/inspector-people-dialog/inspector-people-dialog.component';
import { UserSelfDto } from '../../service/persistence/dto/user.dto';
import { ScreenService } from '../../util/screen.service';

export type ShowFilter = 'connected' | 'all';

// interface filterOptions<T> {
//   value: T;
//   viewValue: string;
//   tooltip: string;
// }

interface TablePageQuery {
  index: number;
  size: number;
}

export interface TableQuery {
  collection: CollectionNames;
  direction: 'upstream' | 'downstream';
  includeRestricted?: boolean;
  text: string;
  showFilter: ShowFilter;
  tags: string[];
  sortActive: string;
  sortDirection: string;
  index: number;
  size: number;
  refresh: number;
}

@Component({
  selector: 'app-collection-table',
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    ReactiveFormsModule,
    RouterModule,
    InspectorVertexFieldComponent,
    InspectorTeamComponent,
  ],
  templateUrl: './collection-table.component.html',
  styleUrl: './collection-table.component.scss',
})
export class CollectionTableComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly collectionApi = inject(CollectionApiService);
  private readonly user = inject<UserSelfDto>(CURRENT_USER);
  private readonly graphUtil = inject(GraphUtilService);
  private readonly configRecord = inject(CONFIG_RECORD);
  private readonly configArr = inject(CONFIG_ARR);
  // private readonly configRecord = inject(CONFIG_RECORD);
  readonly screen = inject(ScreenService);

  // The selected collection to view
  collection = input.required<CollectionNames>();

  // If set, the collection is filtered to those having a connection to the target
  target = input<{
    collection: CollectionNames;
    vertex: string;
    name: string;
    options: ConnectedTableOptions[];
  }>();
  // If target set, show collection dropdown based on configuration
  // collectionOptions = computed(() => {
  //   // const targetCollection = this.target()?.collection;
  //   // if (!targetCollection) {
  //   //   return [];
  //   // }
  //   // const config = this.configRecord[targetCollection];
  //   return this.collectionUtil.computeConnectedTables(
  //     this.target()?.collection,
  //   );
  // });
  upstreamId = computed(() => {
    if (!this.target()?.vertex) {
      return undefined;
    }
    return !this.isUpstreamConnectedCollection(this.collection())
      ? this.target()?.vertex
      : undefined;
  });
  downstreamId = computed(() => {
    if (!this.target()?.vertex) {
      return undefined;
    }
    return this.isUpstreamConnectedCollection(this.collection())
      ? this.target()?.vertex
      : undefined;
  });
  includeRestricted = input<boolean>(false);
  selectedIncludeRestricted = computed(() => {
    const option = this.collectionFilterOptions().find((option) => {
      return option.value === this.collection() && option.direction === this.direction();
    });
    return option?.restrict ?? 'all';
  });

  showConnectionsColumn = signal(() => {
    return true;
  });

  showUserRoles = computed(() => {
    const target = this.target();
    if (!target?.collection) {
      return false;
    }
    // console.log('Checking showUserRoles for', target.collection);
    // console.log(this.configRecord[target.collection]?.showUserRoles);
    return this.configRecord[target.collection]?.showUserRoles === true;
  });

  // The filter text
  text = input('');
  computedText = computed(() =>
    (this.text() ? this.text().length : 0) < 3 ? '' : this.text(),
  );
  showFilter = input<ShowFilter>('connected');
  tags = input('');
  computedTags = computed(() =>
    this.tags() && this.tags().length > 1 ? this.tags().split(',') : [],
  );
  sortActive = input('');
  sortDirection = input<SortDirection>('');
  direction = input<'upstream' | 'downstream'>('downstream');
  restrict = signal<'all' | 'some' | 'none'>('none');

  index = input(0, { transform: (v) => numberAttribute(v, 0) });
  currentIndex = signal(0);

  size = input(10, { transform: (v) => numberAttribute(v, 10) });
  currentSize = signal(10);

  settingsUpdated = output<TableQuery>();

  data = signal<CollectionCombo<any>[]>([]);
  total = signal(0);
  loading = signal(true);

  sort$ = new Subject<Sort>();
  page$ = new Subject<TablePageQuery>();

  readonly sort = viewChild.required(MatSort);

  canFilterConnected: string[] = [];
  showFilterOptions = [
    { value: 'connected', viewValue: 'Connected' },
    { value: 'all', viewValue: 'All' },
  ];

  // config: CollectionConfigDto[] | undefined;
  // readonly config = computed(() => {
  //   return this.configRecord[this.collection()];
  // });
  fields: CollectionFieldConfigMap = {};
  propDisplayedColumns: string[] = [];
  tagList = signal<string[]>([]);
  collectionFilterOptions = computed(() => {
    const targetOptions = this.target()?.options;
    if (targetOptions === undefined) {
      return [];
    }
    return targetOptions.map((option) => {
      const config = this.configRecord[option.collection];
      return {
        value: option.collection,
        viewValue: config?.name ?? option.collection,
        tooltip: config?.hint ?? '',
        direction: option.direction,
        restrict: option.restrict,
      };
    });
  });

  private triggerRefresh = new Subject<number>();

  constructor() {
    const configRecord = this.configRecord;

    effect(() => {
      this.sort$.next({
        active: this.sortActive(),
        direction: this.sortDirection(),
      });
    });

    effect(() => {
      this.currentIndex.set(this.index());
      this.currentSize.set(this.size());
      this.page$.next({
        index: this.currentIndex(),
        size: this.currentSize(),
      });
    });

    effect(() => {
      this.collectionApi
        .getCollectionTags(this.collection() as CollectionNames)
        .subscribe((tags) => {
          this.tagList.set(tags);
        });

      this.fields = configRecord[this.collection()].fields;
      this.propDisplayedColumns = [
        ...(configRecord[this.collection()].browseFields ??
          Object.keys(this.fields)),
        ...(this.showConnectionsColumn() ? ['connections-column'] : []),
        'action-caa4f8db8b42',
      ];
      this.canFilterConnected = this.configArr
        .filter((config) => config.permissions.filter)
        .map((config) => config.collection);

      this.refresh();
    });

    combineLatest([
      toObservable(this.collection),
      toObservable(this.computedText),
      toObservable(this.computedTags),
      toObservable(this.showFilter),
      this.sort$.asObservable().pipe(startWith({ active: '', direction: '' })),
      this.page$.asObservable(),
      this.triggerRefresh,
    ])
      .pipe(
        debounceTime(0),
        switchMap(
          ([collection, text, tags, showFilter, sort, page, refresh]) => {
            return of({
              collection: collection,
              text,
              showFilter,
              tags,
              sortActive: sort.active,
              sortDirection: sort.direction,
              index: page.index,
              size: page.size,
              refresh,
            });
          },
        ),
        distinctUntilChanged<any>((prev: any, curr: any) => {
          // console.log(prev);
          // console.log(curr);
          if (prev.collection !== curr.collection) {
            // Clear data if collection changes to prevent stale data displaying
            // as fields in new collection's table. Otherwise, we keep the data
            // so the UI doesn't flash the table in and out.
            this.data.set([]);
          }
          return (
            prev.refresh === curr.refresh &&
            prev.collection === curr.collection &&
            prev.filter === curr.filter &&
            prev.text === curr.text &&
            prev.showFilter === curr.showFilter &&
            prev.tags &&
            curr.tags &&
            prev.tags.length === curr.tags.length &&
            prev.tags.every((val: any, i: any) => {
              return curr.tags && curr.tags[i] === val;
            }) &&
            prev.sortActive === curr.sortActive &&
            prev.sortDirection === curr.sortDirection &&
            prev.index === curr.index &&
            prev.size === curr.size
          );
        }),
        switchMap((settings) => {
          this.loading.set(true);
          const sortActive = settings.sortActive;
          const sortDirection = settings.sortDirection ?? 'asc';
          // this.settingsUpdated.emit(settings);
          return this.collectionApi
            .searchCollection(settings.collection, {
              ...(settings.text.length >= 3 ? { q: settings.text } : {}),
              ...(settings.tags.length > 0 ? { tags: settings.tags } : {}),
              ...(this.canFilterConnected.includes(settings.collection) &&
                settings.showFilter === 'connected'
                ? { upstreamVertex: this.user.vertex }
                : {}),
              ...(this.upstreamId()
                ? { upstreamVertex: this.upstreamId() }
                : {}),
              ...(this.downstreamId()
                ? { downstreamVertex: this.downstreamId() }
                : {}),
              includeRestricted: this.includeRestricted(),
              sortActive,
              sortDirection,
              offset: settings.index * settings.size,
              limit: settings.size,
            })
            .pipe(
              catchError(() => {
                // Ignore errors for now
                return of({
                  data: [],
                  meta: { total: 0 },
                });
              }),
            );
        }),
      )
      .subscribe((data) => {
        this.data.set(data.data);
        this.total.set(data.meta.total);
        this.loading.set(false);
      });
  }

  onSortChange(sort: Sort) {
    this.updateSettings({
      sortActive: sort.active,
      sortDirection: sort.direction,
    });
  }

  updateSettings(settings: Partial<TableQuery>) {
    this.settingsUpdated.emit({
      collection: this.collection(),
      direction: this.direction(),
      includeRestricted: this.includeRestricted(),
      text: this.text(),
      showFilter: this.showFilter(),
      tags: this.computedTags(),
      sortActive: this.sortActive(),
      sortDirection: this.sortDirection(),
      index: this.index(),
      size: this.size(),
      refresh: 0,
      ...settings,
    });
  }

  onCollectionChange(connection: ConnectedTableOptions) {
    this.updateSettings({
      collection: connection.collection,
      direction: connection.direction,
      includeRestricted: connection.restrict === 'all',
    });
  }

  onIncludeRestrictedChange(includeRestricted: boolean) {
    this.updateSettings({
      includeRestricted,
    });
    // this.includeRestricted.set(includeRestricted);
  }

  ngOnInit(): void {
    this.canFilterConnected = this.configArr
      .filter((config) => config.permissions.filter)
      .map((config) => config.collection);
  }

  ngOnDestroy() {
    this.triggerRefresh.complete();
  }

  refresh() {
    this.triggerRefresh.next(Math.random());
  }

  currentIndexReset() {
    this.currentIndex.set(0);
    this.page$.next({ index: this.currentIndex(), size: this.currentSize() });
  }

  handlePageEvent(event: PageEvent) {
    this.updateSettings({
      index: event.pageIndex,
      size: event.pageSize,
    });
  }

  onTextInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.updateSettings({ text: input.value });
  }

  compareCollectionOption(
    a: { collection: CollectionNames; direction: string },
    b: { collection: CollectionNames; direction: string },
  ): boolean {
    return a?.collection === b?.collection && a?.direction === b?.direction;
  }

  clearAndRefresh() {
    this.currentIndexReset();
    this.updateSettings({
      text: '',
      showFilter: 'all',
      tags: [],
    });
    this.refresh();
  }

  getFieldConfig(key: string) {
    if (!this.configRecord[this.collection() as CollectionNames]) {
      return undefined;
    }
    return this.configRecord[this.collection() as CollectionNames].fields[key];
  }

  openInGraph(event: Event, elem: CollectionComboDto<any>) {
    event.stopPropagation();
    this.graphUtil.openInGraph(elem.vertex.id, 'vertex', false);
  }

  openInInspector(event: Event, id: string) {
    event.stopPropagation();
    this.router.navigate([`/browse/${this.collection()}/${id}`]);
  }

  isUpstreamConnectedCollection(collection?: CollectionNames) {
    const targetOptions = this.target()?.options;
    if (targetOptions === undefined || !collection) {
      return false;
    }
    return (
      targetOptions.find(
        (c) => c.collection === collection && c.direction === 'upstream',
      ) !== undefined
    );
  }

  openUserRolesDialog(element: CollectionComboDto<any>) {
    const target = this.target();
    if (!target) {
      return;
    }
    this.dialog
      .open(InspectorPeopleDialogComponent, {
        closeOnNavigation: true,
        width: '640px',
        data: {
          collection: target.collection,
          vertex: target.vertex,
          filterVertex: element.vertex.id,
          name: target.name,
        },
      })
      .afterClosed()
      .subscribe();
  }
}
