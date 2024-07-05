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
import {
  CollectionData,
  CollectionSearchConnections,
} from '../../service/dto/collection-search-result.dto';
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
  data: CollectionData<any>[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  loading = true;
  disableAdd = true;

  collectionFilter: CollectionNames = 'project';
  collectionFilterOptions: filterOptions<CollectionNames>[] = [];

  constructor(
    public readonly permission: PermissionService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly graphApi: GraphApiService,
    private readonly collectionApi: CollectionApiService,
    @Inject(CURRENT_USER) public readonly user: UserDto,
    public graphUtil: GraphUtilService,
  ) {}

  fields: CollectionFieldConfigMap = {};
  propDisplayedColumns: string[] = [];
  filterValue = '';
  textFilterControl = new FormControl<{ id: string } | string | undefined>(
    undefined,
  );

  private triggerRefresh = new Subject<void>();

  ngOnInit(): void {
    this.collectionFilter = this.route.snapshot.params['collection'];
    this.graphApi.getConfig().subscribe((config) => {
      this.config = config.filter((config) => config.permissions.browse);
      this.collectionFilterOptions = this.config.map((config) => {
        return { value: config.collection, viewValue: config.name };
      });
      this.onCollectionChange();
    });

    this.textFilterControl.valueChanges
      .pipe(startWith(undefined), distinctUntilChanged(), debounceTime(1000))
      .subscribe((searchTerm) => {
        if (
          typeof searchTerm !== 'string' ||
          (searchTerm.length < 3 && searchTerm === this.filterValue)
        ) {
          return;
        }
        this.filterValue = searchTerm.length < 3 ? '' : searchTerm;
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
            // this.graphApi.searchEdgesShallow(
            //   'owner',
            //   'target',
            //   this.user.vertex,
            // ),
          ]);
        }),
      )
      .subscribe(([data]) => {
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
    this.refresh();
  }

  ngOnDestroy() {
    this.triggerRefresh.complete();
  }

  refresh() {
    this.router.navigate(
      [
        `/browse/${this.collectionFilter}`,
        {
          index: this.pageIndex,
          size: this.pageSize,
        },
      ],
      {
        replaceUrl: true,
      },
    );
    this.triggerRefresh.next();
  }

  countUpstream(elem: CollectionSearchConnections, names: string[]) {
    return elem.upstream_edge.filter(
      (edge: any) => names.indexOf(edge.name) !== -1,
    ).length;
  }

  countDownstream(elem: CollectionSearchConnections, names: string[]) {
    return elem.downstream_edge.filter(
      (edge: any) => names.indexOf(edge.name) !== -1,
    ).length;
  }

  onFilterChange() {
    this.pageIndex = 0;
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

    this.refresh();
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

  openInGraph(event: Event, elem: CollectionData<any>) {
    event.stopPropagation();
    this.graphUtil.openInGraph(elem.vertex, 'vertex');
  }

  openInInspector(event: Event, id: string) {
    event.stopPropagation();

    this.router.navigate([`/browse/${this.collectionFilter}/${id}`]);
  }

  clear() {
    this.textFilterControl.setValue('');
  }

  addVertex() {
    this.dialog
      .open(VertexDialogComponent, {
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
            ['/browse', this.collectionFilter, result.data[0].id],
            {
              replaceUrl: true,
            },
          );
        }
      });
  }
}
