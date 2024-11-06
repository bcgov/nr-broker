import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  inject,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
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
import { CollectionApiService } from '../../service/collection-api.service';
import { CONFIG_MAP, CURRENT_USER } from '../../app-initialize.factory';
import { CollectionConfigMap } from '../../service/graph.types';
import { GraphUtilService } from '../../service/graph-util.service';
import { GraphApiService } from '../../service/graph-api.service';
import { GraphTypeaheadData } from '../../service/dto/graph-typeahead-result.dto';
import { CollectionNames } from '../../service/dto/collection-dto-union.type';
import {
  CollectionConfigRestDto,
  CollectionFieldConfigMap,
} from '../../service/dto/collection-config-rest.dto';
import { VertexDialogComponent } from '../../graph/vertex-dialog/vertex-dialog.component';
import { PermissionService } from '../../service/permission.service';
import { TeamRestDto } from '../../service/dto/team-rest.dto';
import { AddTeamDialogComponent } from '../../team/add-team-dialog/add-team-dialog.component';
import { CollectionCombo } from '../../service/dto/collection-search-result.dto';
import { CollectionComboRestDto } from '../../service/dto/collection-combo-rest.dto';
import { PreferencesService } from '../../preferences.service';
import { InspectorVertexFieldComponent } from '../../graph/inspector-vertex-field/inspector-vertex-field.component';
import { InspectorTeamComponent } from '../../graph/inspector-team/inspector-team.component';
import { UserSelfRestDto } from '../../service/dto/user-rest.dto';

type ShowFilter = 'connected' | 'all';

interface filterOptions<T> {
  value: T;
  viewValue: string;
  tooltip: string;
}

interface TablePageQuery {
  index: number;
  size: number;
}

interface TableQuery {
  collection: CollectionNames;
  text: string;
  showFilter: ShowFilter;
  tags: Array<string>;
  sort: Sort;
  page: TablePageQuery;
}

@Component({
  selector: 'app-collection-table',
  standalone: true,
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
export class CollectionTableComponent
  implements AfterViewInit, OnInit, OnDestroy
{
  data: CollectionCombo<any>[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  loading = true;
  disableAdd = true;
  screenSize: string = '';

  // Create a map from breakpoints to css class
  displayNameMap = new Map([
    [Breakpoints.XSmall, 'narrow'],
    [Breakpoints.Small, 'narrow'],
    [Breakpoints.Medium, 'wide'],
    [Breakpoints.Large, 'wide'],
    [Breakpoints.XLarge, 'wide'],
  ]);

  collection$ = new Subject<CollectionNames>();
  collectionSnapshot: CollectionNames = 'project';
  textControl = new FormControl<string>('');
  showControl = new FormControl<string>('');
  tagsControl = new FormControl<string[]>([]);
  sort$ = new Subject<Sort>();
  sortSnapshot: Sort = { active: '', direction: '' };
  page$ = new Subject<TablePageQuery>();
  @ViewChild(MatSort) sort!: MatSort;

  canFilterConnected: string[] = [];
  showFilter: ShowFilter =
    this.preferences.get('browseConnectionFilter') ?? 'connected';
  showFilterOptions = [
    { value: 'connected', viewValue: 'Connected' },
    { value: 'all', viewValue: 'All' },
  ];

  config: CollectionConfigRestDto[] | undefined;
  fields: CollectionFieldConfigMap = {};
  propDisplayedColumns: string[] = [];
  tagList: string[] = [];
  collectionFilterOptions: filterOptions<CollectionNames>[] = [];

  private triggerRefresh = new Subject<number>();
  private ngUnsubscribe: Subject<any> = new Subject();

  constructor(
    public readonly permission: PermissionService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly graphApi: GraphApiService,
    private readonly collectionApi: CollectionApiService,
    private readonly preferences: PreferencesService,
    @Inject(CURRENT_USER) public readonly user: UserSelfRestDto,
    public readonly graphUtil: GraphUtilService,
    @Inject(CONFIG_MAP) private readonly configMap: CollectionConfigMap,
    private changeDetectorRef: ChangeDetectorRef,
  ) {
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
  }

  ngAfterViewInit() {
    // console.log('ngAfterViewInit');
    this.sort.sortChange.asObservable().subscribe({
      next: (v) => {
        this.pageIndexReset();
        this.sort$.next(v);
      },
    });
  }

  ngOnInit(): void {
    // console.log('ngOnInit');
    combineLatest([
      this.collection$.asObservable(),
      this.textControl.valueChanges.pipe(startWith('')),
      this.tagsControl.valueChanges.pipe(startWith([])),
      this.showControl.valueChanges.pipe(startWith('all')),
      this.sort$.asObservable().pipe(startWith({ active: '', direction: '' })),
      this.page$.asObservable(),
      this.triggerRefresh,
    ])
      .pipe(
        debounceTime(0),
        switchMap(
          ([collection, text, tags, showFilter, sort, page, refresh]) => {
            const actualSearchTerm = (text ? text.length : 0) < 3 ? '' : text;
            return of({
              collection,
              text: actualSearchTerm,
              showFilter,
              tags,
              sort,
              page,
              refresh,
            });
          },
        ),
        distinctUntilChanged<any>((prev: any, curr: any) => {
          // console.log(prev);
          // console.log(curr);
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
            prev.sort &&
            curr.sort &&
            prev.sort.active === curr.sort.active &&
            prev.sort.direction === curr.sort.direction &&
            prev.page.index === curr.page.index &&
            prev.page.size === curr.page.size
          );
        }),
        switchMap((settings) => {
          this.loading = true;
          const sortActive = settings.sort?.active;
          const sortDirection = settings.sort?.direction ?? 'asc';
          this.updateRoute(settings);
          return this.collectionApi
            .searchCollection(settings.collection, {
              ...(settings.text.length >= 3 ? { q: settings.text } : {}),
              ...(settings.tags.length > 0 ? { tags: settings.tags } : {}),
              ...(this.canFilterConnected.includes(settings.collection) &&
              settings.showFilter === 'connected'
                ? { upstreamVertex: this.user.vertex }
                : {}),
              sortActive,
              sortDirection,
              offset: settings.page.index * settings.page.size,
              limit: settings.page.size,
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

    this.graphApi.getConfig().subscribe((config) => {
      this.config = config.filter((config) => config.permissions.browse);
      this.canFilterConnected = config
        .filter((config) => config.permissions.filter)
        .map((config) => config.collection);
      this.collectionFilterOptions = this.config.map((config) => {
        return {
          value: config.collection,
          viewValue: config.name,
          tooltip: config.hint,
        };
      });
    });

    this.collection$.subscribe((collection) => {
      this.collectionSnapshot = collection;
      this.collectionApi
        .getCollectionTags(this.collectionSnapshot)
        .subscribe((tags) => {
          this.tagList = tags;
        });
      if (!this.config) {
        return;
      }
      const config = this.config.find(
        (config) => config.collection === this.collectionSnapshot,
      );

      if (!config) {
        return;
      }
      this.fields = config.fields;
      this.propDisplayedColumns = [
        ...(config.browseFields ?? Object.keys(this.fields)),
        'action',
      ];
      this.disableAdd = !config.permissions.create;
    });
    this.collection$.next(this.route.snapshot.params['collection']);

    this.sort$.subscribe((sort) => {
      this.sortSnapshot.active = sort.active;
      this.sortSnapshot.direction = sort.direction;
    });
    this.showControl.valueChanges.subscribe(() => this.pageIndexReset());
    this.tagsControl.valueChanges.subscribe(() => this.pageIndexReset());
    this.textControl.valueChanges.subscribe(() => this.pageIndexReset());

    const params = this.route.snapshot.params;
    if (params['index'] && params['size']) {
      this.pageIndex = params['index'];
      this.pageSize = params['size'];
    }
    if (params['sortActive'] && params['sortDirection']) {
      this.sort$.next({
        active: params['sortActive'],
        direction: params['sortDirection'],
      });
    }
    this.page$.next({
      index: this.pageIndex,
      size: this.pageSize,
    });
    if (params['tags']) {
      const tags = params['tags'].split(',');
      this.tagsControl.setValue(tags);
    }
    this.showControl.setValue(
      params['showFilter'] === 'all' || params['showFilter'] === 'connected'
        ? params['showFilter']
        : 'all',
    );

    this.refresh();
    this.changeDetectorRef.detectChanges();
  }

  ngOnDestroy() {
    this.triggerRefresh.complete();
  }

  updateRoute(settings: TableQuery) {
    this.router.navigate(
      [
        `/browse/${settings.collection}`,
        {
          index: settings.page.index,
          size: settings.page.size,
          sortActive: settings.sort.active,
          sortDirection: settings.sort.direction,
          showFilter: settings.showFilter,
          tags: settings.tags.join(','),
        },
      ],
      {
        replaceUrl: true,
      },
    );
  }

  refresh() {
    this.triggerRefresh.next(Math.random());
  }

  countUpstream(elem: CollectionComboRestDto<any>, names: string[]) {
    return elem.upstream.filter(
      (combo: any) => names.indexOf(combo.edge.name) !== -1,
    ).length;
  }

  countDownstream(elem: CollectionComboRestDto<any>, names: string[]) {
    return elem.downstream.filter(
      (combo: any) => names.indexOf(combo.edge.name) !== -1,
    ).length;
  }

  // onFilterChange(change: MatSelectChange) {
  //   this.pageIndexReset();
  //   this.showFilter$.next(change.value);
  //   this.preferences.set('browseConnectionFilter', change.value);
  // }

  onCollectionChange(change: MatSelectChange) {
    this.collection$.next(change.value);

    this.pageIndexReset();
    this.preferences.set('browseCollectionDefault', this.collectionSnapshot);
    this.sort$.next({ active: '', direction: '' });

    this.clearAndRefresh();
  }

  pageIndexReset() {
    this.pageIndex = 0;
    this.page$.next({ index: this.pageIndex, size: this.pageSize });
  }

  handlePageEvent(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.page$.next({ index: event.pageIndex, size: event.pageSize });
  }

  displayFn(vertex: GraphTypeaheadData): string {
    if (vertex) {
      return vertex.name;
    } else {
      return '';
    }
  }

  openInGraph(event: Event, elem: CollectionComboRestDto<any>) {
    event.stopPropagation();
    this.graphUtil.openInGraph(elem.vertex.id, 'vertex');
  }

  openInInspector(event: Event, id: string) {
    event.stopPropagation();

    this.router.navigate([`/browse/${this.collectionSnapshot}/${id}`]);
  }

  clearAndRefresh() {
    this.pageIndexReset();
    this.textControl.setValue('');
    this.tagsControl.setValue([]);
    this.showControl.setValue('all');
    this.refresh();
  }

  addVertex() {
    const dialogClass: any =
      this.collectionSnapshot === 'team'
        ? AddTeamDialogComponent
        : VertexDialogComponent;
    this.dialog
      .open(dialogClass, {
        width: '500px',
        data: {
          configMap: {
            [this.collectionSnapshot]: this.config?.find(
              (config) => config.collection === this.collectionSnapshot,
            ),
          },
          collection: this.collectionSnapshot,
        },
      })
      .afterClosed()
      .pipe(
        switchMap((result) => {
          if (result && result.id) {
            return this.collectionApi.searchCollection(
              this.collectionSnapshot,
              {
                vertexId: result.id,
                offset: 0,
                limit: 1,
              },
            );
          }
          return of(null);
        }),
      )
      .subscribe((result) => {
        if (result) {
          this.router.navigate(
            ['/browse', this.collectionSnapshot, result.data[0].collection.id],
            {
              replaceUrl: true,
            },
          );
        }
      });
  }

  openTeamDialog(event: Event, elem?: TeamRestDto) {
    event.stopPropagation();
    this.dialog
      .open(AddTeamDialogComponent, {
        width: '600px',
        data: {
          team: elem,
        },
      })
      .afterClosed()
      .subscribe(() => {
        this.refresh();
      });
  }

  getFieldConfig(key: string) {
    if (!this.configMap[this.collectionSnapshot]) {
      return undefined;
    }
    return this.configMap[this.collectionSnapshot].fields[key];
  }
}
