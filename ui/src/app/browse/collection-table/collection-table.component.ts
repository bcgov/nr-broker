import { Component, effect, inject, numberAttribute, input, output, computed, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import {
  MatSort,
  MatSortModule,
  SortDirection,
  Sort,
} from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import {
  Subject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  of,
  startWith,
  switchMap,
  takeUntil,
} from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

import { CollectionApiService } from '../../service/collection-api.service';
import {
  CONFIG_ARR,
  CONFIG_RECORD,
  CURRENT_USER,
} from '../../app-initialize.factory';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { GraphUtilService } from '../../service/graph-util.service';
import { GraphTypeaheadData } from '../../service/graph/dto/graph-typeahead-result.dto';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';
import {
  CollectionConfigDto,
  CollectionFieldConfigMap,
} from '../../service/persistence/dto/collection-config.dto';
import { PermissionService } from '../../service/permission.service';
import { CollectionCombo } from '../../service/collection/dto/collection-search-result.dto';
import { CollectionComboDto } from '../../service/persistence/dto/collection-combo.dto';
import { InspectorVertexFieldComponent } from '../../graph/inspector-vertex-field/inspector-vertex-field.component';
import { InspectorTeamComponent } from '../../graph/inspector-team/inspector-team.component';
import { UserSelfDto } from '../../service/persistence/dto/user.dto';

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
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
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
  readonly permission = inject(PermissionService);
  private readonly router = inject(Router);
  private readonly collectionApi = inject(CollectionApiService);
  readonly user = inject<UserSelfDto>(CURRENT_USER);
  readonly graphUtil = inject(GraphUtilService);
  private readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);
  readonly configArr = inject(CONFIG_ARR);

  collection = input.required<CollectionNames>();
  collectionOptions = input<CollectionNames[]>([]);
  upstreamId = input<string>();
  downstreamId = input<string>();
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

  index = input(0, { transform: (v) => numberAttribute(v, 0) });
  currentIndex = 0;

  size = input(10, { transform: (v) => numberAttribute(v, 10) });
  currentSize = 10;

  settingsUpdated = output<TableQuery>();

  data: CollectionCombo<any>[] = [];
  total = 0;
  loading = true;

  screenSize = '';
  // Create a map from breakpoints to css class
  displayNameMap = new Map([
    [Breakpoints.XSmall, 'narrow'],
    [Breakpoints.Small, 'narrow'],
    [Breakpoints.Medium, 'wide'],
    [Breakpoints.Large, 'wide'],
    [Breakpoints.XLarge, 'wide'],
  ]);

  sort$ = new Subject<Sort>();
  page$ = new Subject<TablePageQuery>();

  @ViewChild(MatSort) sort!: MatSort;

  canFilterConnected: string[] = [];
  showFilterOptions = [
    { value: 'connected', viewValue: 'Connected' },
    { value: 'all', viewValue: 'All' },
  ];

  config: CollectionConfigDto[] | undefined;
  fields: CollectionFieldConfigMap = {};
  propDisplayedColumns: string[] = [];
  tagList: string[] = [];
  collectionFilterOptions = computed(() => {
    return this.configArr
      .filter(
        (config) => this.collectionOptions().indexOf(config.collection) !== -1,
      )
      .map((config) => {
        return {
          value: config.collection,
          viewValue: config.name,
          tooltip: config.hint,
        };
      });
  });

  private triggerRefresh = new Subject<number>();
  private ngUnsubscribe = new Subject<any>();

  constructor() {
    const configRecord = this.configRecord;

    effect(() => {
      this.sort$.next({
        active: this.sortActive(),
        direction: this.sortDirection(),
      });
    });

    effect(() => {
      this.currentIndex = this.index();
      this.currentSize = this.size();
      this.page$.next({
        index: this.currentIndex,
        size: this.currentSize,
      });
    });

    effect(() => {
      this.collectionApi
        .getCollectionTags(this.collection() as CollectionNames)
        .subscribe((tags) => {
          this.tagList = tags;
        });

      this.fields = configRecord[this.collection()].fields;
      this.propDisplayedColumns = [
        ...(configRecord[this.collection()].browseFields ??
          Object.keys(this.fields)),
        'action-caa4f8db8b42',
      ];
      this.canFilterConnected = this.configArr
        .filter((config) => config.permissions.filter)
        .map((config) => config.collection);

      this.refresh();
    });

    inject(BreakpointObserver)
      .observe([
        Breakpoints.XSmall,
        Breakpoints.Small,
        Breakpoints.Medium,
        Breakpoints.Large,
        Breakpoints.XLarge,
      ])
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((result) => {
        for (const query of Object.keys(result.breakpoints)) {
          if (result.breakpoints[query]) {
            this.screenSize = this.displayNameMap.get(query) ?? 'Unknown';
          }
        }
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
            this.data = [];
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
          this.loading = true;
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
        this.data = data.data;
        this.total = data.meta.total;
        this.loading = false;
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

  countUpstream(elem: CollectionComboDto<any>, names: string[]) {
    return elem.upstream.filter(
      (combo: any) => names.indexOf(combo.edge.name) !== -1,
    ).length;
  }

  countDownstream(elem: CollectionComboDto<any>, names: string[]) {
    return elem.downstream.filter(
      (combo: any) => names.indexOf(combo.edge.name) !== -1,
    ).length;
  }

  currentIndexReset() {
    this.currentIndex = 0;
    this.page$.next({ index: this.currentIndex, size: this.currentSize });
  }

  handlePageEvent(event: PageEvent) {
    this.updateSettings({
      index: event.pageIndex,
      size: event.pageSize,
    });
  }

  displayFn(vertex: GraphTypeaheadData): string {
    if (vertex) {
      return vertex.name;
    } else {
      return '';
    }
  }

  onTextInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.updateSettings({ text: input.value });
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
    this.graphUtil.openInGraph(elem.vertex.id, 'vertex');
  }

  openInInspector(event: Event, id: string) {
    event.stopPropagation();

    this.router.navigate([`/browse/${this.collection()}/${id}`]);
  }
}
