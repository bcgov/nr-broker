import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { Subject, catchError, combineLatest, of, switchMap, tap } from 'rxjs';
import { CollectionApiService } from '../service/collection-api.service';
import { CURRENT_USER } from '../app-initialize.factory';
import { UserDto } from '../service/graph.types';
import {
  CollectionData,
  CollectionSearchConnections,
} from '../service/dto/collection-search-result.dto';
import { MemberDialogComponent } from './member-dialog/member-dialog.component';
import { TeamRestDto } from '../service/dto/team-rest.dto';
import { GraphUtilService } from '../service/graph-util.service';
import { AddTeamDialogComponent } from './add-team-dialog/add-team-dialog.component';
import { GraphApiService } from '../service/graph-api.service';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatListModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    RouterModule,
    AddTeamDialogComponent,
  ],
  templateUrl: './team.component.html',
  styleUrls: ['./team.component.scss'],
})
export class TeamComponent implements OnInit, OnDestroy {
  data: CollectionData<TeamRestDto>[] = [];
  ownedVertex: string[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  loading = true;
  showFilter: 'myteams' | 'all' = 'myteams';
  showFilterOptions = [
    { value: 'myteams', viewValue: 'My Teams' },
    { value: 'all', viewValue: 'All' },
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly graphApi: GraphApiService,
    private readonly collectionApi: CollectionApiService,
    private readonly dialog: MatDialog,
    @Inject(CURRENT_USER) public readonly user: UserDto,
    public graphUtil: GraphUtilService,
  ) {}

  fields = [
    { value: 'name', viewValue: 'Name' },
    { value: 'email', viewValue: 'Email' },
    { value: 'owners', viewValue: 'Owners' },
    { value: 'developers', viewValue: 'Developers' },
    { value: 'accounts', viewValue: 'Accounts' },
    { value: 'action', viewValue: 'Action' },
  ];
  propDisplayedColumns: string[] = [
    'name',
    'email',
    'owners',
    'developers',
    'accounts',
    'action',
  ];

  private triggerRefresh = new Subject<void>();

  ngOnInit(): void {
    // console.log(this.user);
    this.triggerRefresh
      .pipe(
        tap(() => {
          this.loading = true;
        }),
        switchMap(() => {
          return combineLatest([
            this.collectionApi
              .searchCollection(
                'team',
                this.showFilter === 'myteams' ? this.user.vertex : null,
                null,
                this.pageIndex * this.pageSize,
                this.pageSize,
              )
              .pipe(
                catchError(() => {
                  // Ignore errors for now
                  return of({
                    data: [],
                    meta: { total: 0 },
                  });
                }),
              ),
            this.graphApi.searchEdgesShallow(
              'owner',
              'target',
              this.user.vertex,
            ),
          ]);
        }),
      )
      .subscribe(([data, ownedVertex]) => {
        this.data = data.data;
        this.total = data.meta.total;
        this.ownedVertex = ownedVertex;
        this.loading = false;
      });
    const params = this.route.snapshot.params;
    if (params['index']) {
      this.pageIndex = params['index'];
    }
    if (params['size']) {
      this.pageSize = params['size'];
    }
    if (params['showFilter']) {
      this.showFilter = params['showFilter'];
    }
    this.refresh();
  }

  ngOnDestroy() {
    this.triggerRefresh.complete();
  }

  refresh() {
    this.router.navigate(
      [
        '/teams',
        {
          index: this.pageIndex,
          size: this.pageSize,
          showFilter: this.showFilter,
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

  handlePageEvent(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.refresh();
  }

  openMemberDialog(elem: CollectionData<TeamRestDto>) {
    // console.log(elem);
    this.dialog
      .open(MemberDialogComponent, {
        width: '600px',
        data: { id: elem.id, vertex: elem.vertex, name: elem.name },
      })
      .afterClosed()
      .subscribe(() => {
        this.refresh();
      });
  }

  openInGraph(elem: CollectionData<TeamRestDto>) {
    this.graphUtil.openInGraph(elem.vertex, 'vertex');
  }

  onFilterChange() {
    this.pageIndex = 0;
    this.refresh();
  }

  isTargetOwner(elem: TeamRestDto) {
    return this.ownedVertex.indexOf(elem.vertex) !== -1;
  }

  openTeamDialog(elem?: TeamRestDto) {
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
    console.log('openTeamDialog');
  }
}
