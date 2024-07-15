import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
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
  tap,
} from 'rxjs';
import { CollectionApiService } from '../../service/collection-api.service';
import { CURRENT_USER } from '../../app-initialize.factory';
import { UserDto } from '../../service/graph.types';
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

interface filterOptions<T> {
  value: T;
  viewValue: string;
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
    MatTableModule,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './collection-table.component.html',
  styleUrl: './collection-table.component.scss',
})
export class CollectionTableComponent implements OnInit, OnDestroy {
  public config: CollectionConfigRestDto[] | undefined;
  data: CollectionCombo<any>[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  loading = true;
  disableAdd = true;

  collectionFilter: CollectionNames = 'project';
  collectionFilterOptions: filterOptions<CollectionNames>[] = [];

  canFilter = ['team', 'project', 'brokerAccount', 'service'];
  showFilter: 'connected' | 'all' =
    this.preferences.get('browseConnectionFilter') ?? 'connected';
  showFilterOptions = [
    { value: 'connected', viewValue: 'Connected' },
    { value: 'all', viewValue: 'All' },
  ];

  fields: CollectionFieldConfigMap = {};
  propDisplayedColumns: string[] = [];
  filterValue = '';
  textFilterControl = new FormControl<{ id: string } | string | undefined>(
    undefined,
  );

  tagsFilterControl = new FormControl<string[]>([]);
  tagList: string[] = [];
  tagValue: string[] = [];

  private triggerRefresh = new Subject<void>();

  constructor(
    public readonly permission: PermissionService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly graphApi: GraphApiService,
    private readonly collectionApi: CollectionApiService,
    private readonly preferences: PreferencesService,
    @Inject(CURRENT_USER) public readonly user: UserDto,
    public graphUtil: GraphUtilService,
  ) {}

  ngOnInit(): void {
    this.collectionFilter = this.route.snapshot.params['collection'];
    this.graphApi.getConfig().subscribe((config) => {
      this.config = config.filter((config) => config.permissions.browse);
      this.collectionFilterOptions = this.config.map((config) => {
        return { value: config.collection, viewValue: config.name };
      });
      this.onCollectionChange();
    });

    combineLatest([
      this.textFilterControl.valueChanges.pipe(
        startWith(''),
        distinctUntilChanged(),
        debounceTime(1000),
      ),
      this.tagsFilterControl.valueChanges.pipe(
        startWith([]),
        distinctUntilChanged(),
        debounceTime(1000),
      ),
    ]).subscribe(([searchTerm, tags]) => {
      if (typeof searchTerm !== 'string' || !Array.isArray(tags)) {
        return;
      }
      const actualSearchTeam = searchTerm.length < 3 ? '' : searchTerm;
      if (
        actualSearchTeam === this.filterValue &&
        tags.length === this.tagValue.length &&
        tags.every((val, i) => {
          return this.tagValue[i] === val;
        })
      ) {
        return;
      }
      this.filterValue = actualSearchTeam;
      this.tagValue = tags;
      this.pageIndex = 0;
      this.triggerRefresh.next();
    });

    this.triggerRefresh
      .pipe(
        tap(() => {
          this.loading = true;
        }),
        switchMap(() => {
          return combineLatest([
            this.collectionApi
              .searchCollection(this.collectionFilter, {
                ...(this.filterValue.length >= 3
                  ? { q: this.filterValue }
                  : {}),
                ...(this.tagValue.length > 0 ? { tags: this.tagValue } : {}),
                ...(this.canFilter.includes(this.collectionFilter) &&
                this.showFilter === 'connected'
                  ? { upstreamVertex: this.user.vertex }
                  : {}),
                offset: this.pageIndex * this.pageSize,
                limit: this.pageSize,
              })
              .pipe(
                catchError(() => {
                  // Ignore errors for now
                  return of({
                    data: [],
                    meta: { total: 0 },
                  });
                }),
              ),
          ]);
        }),
      )
      .subscribe(([data]) => {
        this.updateRoute();
        this.data = data.data;
        this.total = data.meta.total;
        this.loading = false;
      });
    const params = this.route.snapshot.params;
    if (params['index']) {
      this.pageIndex = params['index'];
    }
    if (params['size']) {
      this.pageSize = params['size'];
    }
    if (params['tags']) {
      this.tagValue = params['tags'].split(',');
      this.tagsFilterControl.setValue(this.tagValue);
    }
    this.refresh();
  }

  ngOnDestroy() {
    this.triggerRefresh.complete();
  }

  updateRoute() {
    this.router.navigate(
      [
        `/browse/${this.collectionFilter}`,
        {
          index: this.pageIndex,
          size: this.pageSize,
          tags: this.tagValue.join(','),
        },
      ],
      {
        replaceUrl: true,
      },
    );
  }

  refresh() {
    this.updateRoute();
    this.triggerRefresh.next();
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

  onFilterChange() {
    this.pageIndex = 0;
    this.preferences.set('browseConnectionFilter', this.showFilter);
    this.refresh();
  }

  onCollectionChange() {
    if (!this.config) {
      return;
    }
    const config = this.config.find(
      (config) => config.collection === this.collectionFilter,
    );

    if (!config) {
      return;
    }
    this.fields = config.fields;
    this.propDisplayedColumns = [
      ...(config.browseFields ?? Object.keys(this.fields)),
      'action',
    ];
    this.pageIndex = 0;
    this.disableAdd = !config.permissions.create;

    this.collectionApi
      .getCollectionTags(this.collectionFilter)
      .subscribe((tags) => {
        this.tagList = tags;
      });

    this.clearAndRefresh();
  }

  handlePageEvent(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.refresh();
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

    this.router.navigate([`/browse/${this.collectionFilter}/${id}`]);
  }

  clearAndRefresh() {
    this.tagValue = [];
    this.filterValue = '';
    this.textFilterControl.setValue('');
    this.tagsFilterControl.setValue([]);
    this.refresh();
  }

  addVertex() {
    const dialogClass: any =
      this.collectionFilter === 'team'
        ? AddTeamDialogComponent
        : VertexDialogComponent;
    this.dialog
      .open(dialogClass, {
        width: '500px',
        data: {
          configMap: {
            [this.collectionFilter]: this.config?.find(
              (config) => config.collection === this.collectionFilter,
            ),
          },
          collection: this.collectionFilter,
        },
      })
      .afterClosed()
      .pipe(
        switchMap((result) => {
          if (result && result.id) {
            return this.collectionApi.searchCollection(this.collectionFilter, {
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
            ['/browse', this.collectionFilter, result.data[0].collection.id],
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
}
