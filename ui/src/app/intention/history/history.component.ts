import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { Subject, catchError, of, switchMap } from 'rxjs';

import { IntentionApiService } from '../../service/intention-api.service';
import { ActionContentComponent } from '../action-content/action-content.component';

@Component({
  selector: 'app-history',
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
    ActionContentComponent,
  ],
  templateUrl: './history.component.html',
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
    { value: 'service', viewValue: 'Service' },
    { value: 'action', viewValue: 'Action' },
    { value: 'username', viewValue: 'Username' },
  ];
  selectedStatus: string = 'all';
  status = [
    { value: 'all', viewValue: 'All' },
    { value: 'success', viewValue: 'Success' },
    { value: 'failure', viewValue: 'Failure' },
  ];
  propDisplayedColumns: string[] = [
    'project',
    'service',
    'action',
    'reason',
    'start',
    'duration',
    'outcome',
    'user',
  ];
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
          let whereClause = {};
          this.loading = true;
          if (this.selectedField) {
            if (this.selectedField === 'id') {
              whereClause = {
                ...(this.fieldValue ? { _id: this.fieldValue.trim() } : {}),
                ...(this.selectedStatus !== 'all'
                  ? { 'transaction.outcome': this.selectedStatus }
                  : {}),
              };
            } else if (this.selectedField === 'service') {
              whereClause = {
                ...(this.fieldValue
                  ? { 'actions.service.name': this.fieldValue.trim() }
                  : {}),
                ...(this.selectedStatus !== 'all'
                  ? { 'transaction.outcome': this.selectedStatus }
                  : {}),
              };
            } else if (this.selectedField === 'action') {
              whereClause = {
                ...(this.fieldValue
                  ? { 'actions.action': this.fieldValue.trim() }
                  : {}),
                ...(this.selectedStatus !== 'all'
                  ? { 'transaction.outcome': this.selectedStatus }
                  : {}),
              };
            } else if (this.selectedField === 'username') {
              whereClause = {
                ...(this.fieldValue
                  ? { 'actions.user.name': this.fieldValue.trim() }
                  : {}),
                ...(this.selectedStatus !== 'all'
                  ? { 'transaction.outcome': this.selectedStatus }
                  : {}),
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
          status: this.selectedStatus ?? 'all',
        },
      ],
      {
        replaceUrl: true,
      },
    );
    this.triggerRefresh.next();
  }
}
