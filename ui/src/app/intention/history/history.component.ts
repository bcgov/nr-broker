import { Component, computed, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
import { catchError, of } from 'rxjs';

import { IntentionApiService } from '../../service/intention-api.service';
import { HistoryTableComponent } from '../history-table/history-table.component';

@Component({
  selector: 'app-history',
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
export class HistoryComponent {
  field = input('');
  currentField = this.field();
  fieldOptions = [
    { value: '', viewValue: '' },
    { value: 'id', viewValue: 'ID' },
    { value: 'project', viewValue: 'Project' },
    { value: 'service', viewValue: 'Service' },
    { value: 'action', viewValue: 'Action' },
    { value: 'username', viewValue: 'Username' },
  ];

  value = input('');
  currentValue = this.value();

  readonly lifespan = input<string>('permanent');
  currentLifespan = this.lifespan();
  lifespanOptions = [
    { value: 'all', viewValue: 'All' },
    { value: 'permanent', viewValue: 'Permanent' },
    { value: 'transient', viewValue: 'Transient' },
  ];

  readonly status = input<string>('all');
  currentStatus = this.status();
  statusOptions = [
    { value: 'all', viewValue: 'All' },
    { value: 'success', viewValue: 'Success' },
    { value: 'failure', viewValue: 'Failure' },
  ];

  index = input('0');
  indexNumber = computed(() => Number(this.index()));
  currentIndex = this.indexNumber();

  size = input('10');
  sizeNumber = computed(() => Number(this.size()));
  currentSize = this.sizeNumber();

  rangeStart = input();
  rangeEnd = input();

  range = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });

  intentionData: any[] = [];
  intentionTotal = 0;

  loading = true;

  constructor(
    private readonly router: Router,
    private readonly intentionApi: IntentionApiService,
  ) {
    // console.log(`Index changed: ${typeof this.index()}`);

    effect(() => {
      this.currentField = this.field();
      this.currentValue = this.value();
      this.currentLifespan = this.lifespan();
      this.currentStatus = this.status();
      this.currentIndex = this.indexNumber();
      this.currentSize = this.sizeNumber();
      this.range.setValue({
        start: this.rangeStart()
          ? new Date(Number.parseInt(this.rangeStart() as string))
          : null,
        end: this.rangeEnd()
          ? new Date(Number.parseInt(this.rangeEnd() as string))
          : null,
      });
      this.loadData();
    });
  }

  loadData() {
    this.loading = true;
    let whereClause: any = {
      ...(this.currentStatus !== 'all'
        ? {
            'transaction.outcome': this.currentStatus,
          }
        : {}),
    };
    if (this.currentField) {
      if (this.currentField === 'id') {
        whereClause = {
          ...whereClause,
          ...(this.currentValue ? { _id: this.currentValue.trim() } : {}),
        };
      } else if (this.currentField === 'service') {
        whereClause = {
          ...whereClause,
          ...(this.currentValue
            ? { 'actions.service.name': this.currentValue.trim() }
            : {}),
        };
      } else if (this.currentField === 'project') {
        whereClause = {
          ...whereClause,
          ...(this.currentValue
            ? { 'actions.service.project': this.currentValue.trim() }
            : {}),
        };
      } else if (this.currentField === 'action') {
        whereClause = {
          ...whereClause,
          ...(this.currentValue
            ? { 'actions.action': this.currentValue.trim() }
            : {}),
        };
      } else if (this.currentField === 'username') {
        whereClause = {
          ...whereClause,
          ...(this.currentValue
            ? { 'actions.user.name': this.currentValue.trim() }
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
    // console.log(this.lifespan());
    if (this.lifespan() === 'permanent') {
      whereClause = {
        ...whereClause,
        'event.transient': null,
      };
    }
    if (this.lifespan() === 'transient') {
      whereClause = {
        ...whereClause,
        'event.transient': true,
      };
    }
    return this.intentionApi
      .searchIntentions(
        JSON.stringify(whereClause),
        this.indexNumber() * this.sizeNumber(),
        this.sizeNumber(),
      )
      .pipe(
        catchError(() => {
          // Ignore errors for now
          return of({
            data: [],
            meta: { total: 0 },
          });
        }),
      )
      .subscribe((data) => {
        this.intentionData = data.data;
        this.intentionTotal = data.meta.total;
        this.loading = false;
      });
  }

  handlePageEvent(event: PageEvent) {
    this.currentIndex = event.pageIndex;
    this.currentSize = event.pageSize;
    this.refresh();
  }

  clear() {
    this.currentIndex = 0;
    this.currentField = '';
    this.currentValue = '';
    this.currentStatus = 'all';
    this.currentLifespan = 'permanent';
    this.range.reset();
    this.refresh();
  }

  filter() {
    this.currentIndex = 0;
    this.refresh();
  }

  refresh() {
    // console.log('refresh navigation');
    this.router.navigate(
      [
        '/intention/history',
        {
          index: this.currentIndex,
          size: this.currentSize,
          field: this.currentField ?? 'id',
          value: this.currentValue ?? '',
          lifespan: this.currentLifespan ?? 'permanent',
          status: this.currentStatus ?? 'all',
          ...(this.range.value.start
            ? { rangeStart: this.range.value.start.valueOf() }
            : {}),
          ...(this.range.value.end
            ? { rangeEnd: this.range.value.end.valueOf() }
            : {}),
        },
      ],
      {
        replaceUrl: true,
      },
    );
  }

  viewIntention(id: string) {
    this.currentIndex = 0;
    this.currentField = 'id';
    this.currentValue = id;
    this.currentLifespan = 'permanent';
    this.currentStatus = 'all';
    this.range.reset();
    this.filter();
  }
}
