import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormsModule,
  FormGroup,
  FormControl,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Subject, catchError, of, switchMap } from 'rxjs';

import { IntentionApiService } from '../../service/intention-api.service';
import { HistoryTableComponent } from '../history-table/history-table.component';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    ReactiveFormsModule,
    HistoryTableComponent,
  ],
  templateUrl: './history.component.html',
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition(
        'expanded <=> collapsed',
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)'),
      ),
    ]),
  ],
  styleUrls: ['./history.component.scss'],
})
export class HistoryComponent implements OnInit, OnDestroy {
  intentionData: any[] = [];
  intentionTotal = 0;
  pageIndex = 0;
  pageSize = 10;
  loading = true;
  selectedField: string = '';
  fieldValue!: string;
  fields = [
    { value: '', viewValue: '' },
    { value: 'id', viewValue: 'ID' },
    { value: 'project', viewValue: 'Project' },
    { value: 'service', viewValue: 'Service' },
    { value: 'action', viewValue: 'Action' },
    { value: 'username', viewValue: 'Username' },
  ];
  selectedLifespan: string = 'permanent';
  lifespan = [
    { value: 'all', viewValue: 'All' },
    { value: 'permanent', viewValue: 'Permanent' },
    { value: 'transient', viewValue: 'Transient' },
  ];
  selectedStatus: string = 'all';
  status = [
    { value: 'all', viewValue: 'All' },
    { value: 'success', viewValue: 'Success' },
    { value: 'failure', viewValue: 'Failure' },
  ];
  range = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });
  private triggerRefresh = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly intentionApi: IntentionApiService,
  ) {}

  ngOnInit(): void {
    this.triggerRefresh
      .pipe(
        switchMap(() => {
          let whereClause: any = {
            ...(this.selectedStatus !== 'all'
              ? {
                  'transaction.outcome': this.selectedStatus,
                }
              : {}),
          };
          this.loading = true;
          if (this.selectedField) {
            if (this.selectedField === 'id') {
              whereClause = {
                ...whereClause,
                ...(this.fieldValue ? { _id: this.fieldValue.trim() } : {}),
              };
            } else if (this.selectedField === 'service') {
              whereClause = {
                ...whereClause,
                ...(this.fieldValue
                  ? { 'actions.service.name': this.fieldValue.trim() }
                  : {}),
              };
            } else if (this.selectedField === 'project') {
              whereClause = {
                ...whereClause,
                ...(this.fieldValue
                  ? { 'actions.service.project': this.fieldValue.trim() }
                  : {}),
              };
            } else if (this.selectedField === 'action') {
              whereClause = {
                ...whereClause,
                ...(this.fieldValue
                  ? { 'actions.action': this.fieldValue.trim() }
                  : {}),
              };
            } else if (this.selectedField === 'username') {
              whereClause = {
                ...whereClause,
                ...(this.fieldValue
                  ? { 'actions.user.name': this.fieldValue.trim() }
                  : {}),
              };
            }
          }
          if (this.range.value.start && this.range.value.end) {
            // Add 1 day to end date to be inclusive of the day
            const endData = new Date(this.range.value.end.getTime());
            endData.setDate(endData.getDate() + 1);
            whereClause = {
              ...whereClause,
              'transaction.start': {
                $gte: this.range.value.start,
                $lt: endData,
              },
            };
          }
          if (this.selectedLifespan !== 'all') {
            if (this.selectedLifespan === 'permanent') {
              whereClause = {
                ...whereClause,
                ...(this.fieldValue ? { 'event.transient': null } : {}),
              };
            }
            if (this.selectedLifespan === 'transient') {
              whereClause = {
                ...whereClause,
                ...(this.fieldValue ? { 'event.transient': true } : {}),
              };
            }
          }
          return this.intentionApi
            .searchIntentions(
              JSON.stringify(whereClause),
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
        this.intentionData = data.data;
        this.intentionTotal = data.meta.total;
        this.loading = false;
      });
    const params = this.route.snapshot.params;
    if (params['index']) {
      this.pageIndex = params['index'];
    }
    if (params['size']) {
      this.pageSize = params['size'];
    }
    if (params['field']) {
      this.selectedField = params['field'];
    }
    if (params['value']) {
      this.fieldValue = params['value'];
    }
    if (params['lifespan']) {
      this.fieldValue = params['lifespan'];
    }
    if (params['status']) {
      this.selectedStatus = params['status'];
    }
    this.refresh();
  }

  ngOnDestroy() {
    this.triggerRefresh.complete();
  }

  handlePageEvent(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.refresh();
  }

  clear() {
    this.pageIndex = 0;
    this.selectedField = '';
    this.fieldValue = '';
    this.selectedStatus = 'all';
    this.range.reset();
    this.refresh();
  }

  filter() {
    this.pageIndex = 0;
    this.refresh();
  }

  refresh() {
    this.router.navigate(
      [
        '/intention/history',
        {
          index: this.pageIndex,
          size: this.pageSize,
          field: this.selectedField ?? 'id',
          value: this.fieldValue ?? '',
          lifespan: this.lifespan ?? 'permanent',
          status: this.selectedStatus ?? 'all',
        },
      ],
      {
        replaceUrl: true,
      },
    );
    this.triggerRefresh.next();
  }

  viewIntention(id: string) {
    this.pageIndex = 0;
    this.selectedField = 'id';
    this.fieldValue = id;
    this.selectedStatus = 'all';
    this.range.reset();
    this.filter();
  }
}
