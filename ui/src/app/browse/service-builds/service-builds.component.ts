import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, input, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import {
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  of,
  startWith,
  Subject,
  switchMap,
} from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CollectionUtilService } from '../../service/collection-util.service';
import { PackageApiService } from '../../service/package-api.service';
import { PackageBuildDto } from '../../service/persistence/dto/package-build.dto';

interface TablePageQuery {
  index: number;
  size: number;
}

@Component({
  selector: 'app-service-builds',
  imports: [
    CommonModule,
    ClipboardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  templateUrl: './service-builds.component.html',
  styleUrl: './service-builds.component.scss',
})
export class ServiceBuildsComponent
  implements OnInit, OnDestroy
{
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly collectionUtil = inject(CollectionUtilService);
  private readonly packageApi = inject(PackageApiService);

  readonly serviceId = input.required<string>();
  readonly isApprover = input.required<boolean>();

  data: any[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  loading = true;

  page$ = new Subject<TablePageQuery>();
  sort$ = new Subject<Sort>();

  public disableApprove: Record<string, boolean> = {};

  propDisplayedColumns: string[] = [
    'version',
    'date',
    'name',
    'type',
    'approval',
  ];

  private triggerRefresh = new Subject<number>();

  // ngAfterViewInit() {
  //   // console.log('ngAfterViewInit');
  //   // this.sort.sortChange.asObservable().subscribe({
  //   //   next: (v) => {
  //   //     this.pageIndexReset();
  //   //     this.sort$.next(v);
  //   //   },
  //   // });
  // }

  ngOnInit(): void {
    // console.log('ngOnInit');
    combineLatest([
      this.sort$.asObservable().pipe(startWith({ active: '', direction: '' })),
      this.page$.asObservable(),
      this.triggerRefresh,
    ])
      .pipe(
        debounceTime(0),
        switchMap(([sort, page, refresh]) => {
          return of({
            sort,
            page,
            refresh,
          });
        }),
        distinctUntilChanged<any>((prev: any, curr: any) => {
          // console.log(prev);
          // console.log(curr);
          return (
            prev.refresh === curr.refresh &&
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
          // const sortActive = settings.sort?.active;
          // const sortDirection = settings.sort?.direction ?? 'asc';
          // this.updateRoute(settings);
          return this.packageApi
            .searchBuilds(
              this.serviceId(),
              // sortActive,
              // sortDirection,
              settings.page.index * settings.page.size,
              settings.page.size,
            )
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
    const params = this.route.snapshot.params;
    if (params['index'] && params['size']) {
      this.pageIndex = params['index'];
      this.pageSize = params['size'];
    }
    this.page$.next({
      index: this.pageIndex,
      size: this.pageSize,
    });

    this.refresh();
  }

  ngOnDestroy() {
    this.triggerRefresh.complete();
  }

  refresh() {
    this.triggerRefresh.next(Math.random());
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

  approvePackageBuild(event: Event, build: PackageBuildDto) {
    event.stopPropagation();
    this.disableApprove[build.id] = true;
    this.packageApi.approveBuild(build.id).subscribe(() => {
      this.refresh();
    });
  }

  openInBrowser(event: Event, elem: PackageBuildDto) {
    event.stopPropagation();
    this.collectionUtil.openServicePackage(elem.service, elem.id);
  }
}
