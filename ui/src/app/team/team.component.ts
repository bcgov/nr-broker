import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, catchError, of, switchMap } from 'rxjs';
import { CollectionApiService } from '../service/collection-api.service';
import { CURRENT_USER } from '../app-initialize.factory';
import { UserDto } from '../service/graph.types';
import {
  CollectionData,
  CollectionSearchConnections,
} from '../service/dto/collection-search-result.dto';
import { MemberDialogComponent } from './member-dialog/member-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { TeamSearchDto } from '../service/dto/team-rest.dto';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatListModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  templateUrl: './team.component.html',
  styleUrls: ['./team.component.scss'],
})
export class TeamComponent implements OnInit, OnDestroy {
  teamData: CollectionData<TeamSearchDto>[] = [];
  teamTotal = 0;
  pageIndex = 0;
  pageSize = 10;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private collectionApi: CollectionApiService,
    private dialog: MatDialog,
    @Inject(CURRENT_USER) public user: UserDto,
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
        switchMap(() => {
          this.loading = true;
          return this.collectionApi
            .searchCollection(
              'team',
              this.user.vertex,
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
            );
        }),
      )
      .subscribe((data) => {
        this.teamData = data.data;
        this.teamTotal = data.meta.total;
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
        '/teams',
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

  handlePageEvent(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.refresh();
  }

  openMemberDialog(elem: CollectionData<TeamSearchDto>) {
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
}
