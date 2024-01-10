import { Component, Inject, OnDestroy, OnInit } from '@angular/core';

import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import {
  Observable,
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
import { PreferencesService } from '../preferences.service';
import { CommonModule } from '@angular/common';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import {
  GraphTypeaheadData,
  GraphTypeaheadResult,
} from '../service/dto/graph-typeahead-result.dto';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    ReactiveFormsModule,
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
    private readonly preferences: PreferencesService,
    public graphUtil: GraphUtilService,
  ) {}

  fields = [
    { value: 'name', viewValue: 'Name' },
    { value: 'owners', viewValue: 'Owners' },
    { value: 'developers', viewValue: 'Developers' },
    { value: 'accounts', viewValue: 'Accounts' },
    { value: 'action', viewValue: 'Action' },
  ];
  propDisplayedColumns: string[] = [
    'name',
    'owners',
    'developers',
    'accounts',
    'action',
  ];
  filteredOptions!: Observable<GraphTypeaheadResult>;
  teamControl = new FormControl<{ id: string } | string | undefined>(undefined);

  private triggerRefresh = new Subject<void>();

  ngOnInit(): void {
    // console.log(this.user);
    this.showFilter = this.preferences.get('teamFilterShow');
    this.filteredOptions = this.teamControl.valueChanges.pipe(
      startWith(undefined),
      distinctUntilChanged(),
      debounceTime(1000),
      switchMap((searchTerm) => {
        if (typeof searchTerm === 'string' && searchTerm.length >= 3) {
          return this.graphApi.doTypeaheadSearch(searchTerm, ['team']);
        }
        return of({
          meta: {
            total: 0,
          },
          data: [],
        });
      }),
    );
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

  onFilterChange() {
    this.pageIndex = 0;
    this.preferences.set('teamFilterShow', this.showFilter);
    this.refresh();
  }

  handlePageEvent(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.refresh();
  }

  isTargetOwner(elem: TeamRestDto) {
    return this.ownedVertex.indexOf(elem.vertex) !== -1;
  }

  openTeamPage(elem: TeamRestDto) {
    this.router.navigate(['teams', elem.id]);
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

  openMemberDialog(event: Event, elem: CollectionData<TeamRestDto>) {
    event.stopPropagation();
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

  displayFn(vertex: GraphTypeaheadData): string {
    if (vertex) {
      return vertex.name;
    } else {
      return '';
    }
  }

  // openInGraph(event: Event, elem: CollectionData<TeamRestDto>) {
  //   event.stopPropagation();
  //   this.graphUtil.openInGraph(elem.vertex, 'vertex');
  // }
}
