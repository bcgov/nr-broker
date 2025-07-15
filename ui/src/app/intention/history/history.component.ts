import {
  Component,
  input,
  effect,
  numberAttribute,
  inject,
  OnDestroy,
} from '@angular/core';
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
import { SortDirection } from '@angular/material/sort';
import { httpResource } from '@angular/common/http';
import { debounceTime, Subject, takeUntil } from 'rxjs';

import { IntentionApiService } from '../../service/intention-api.service';
import { HistoryTableComponent } from '../history-table/history-table.component';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

export interface HistoryQuery {
  field: string;
  value: string;
  status: string;
  lifespan: string;
  rangeStart: number;
  rangeEnd: number;
  sortActive: string;
  sortDirection: string;
  index: number;
  size: number;
  refresh: number;
}

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
export class HistoryComponent implements OnDestroy {
  field = input('');
  currentField = '';
  fieldOptions = [
    { value: '', viewValue: '' },
    { value: 'id', viewValue: 'ID' },
    { value: 'project', viewValue: 'Project' },
    { value: 'service', viewValue: 'Service' },
    { value: 'action', viewValue: 'Action' },
    { value: 'username', viewValue: 'Username' },
  ];

  value = input('');
  currentValue = '';
  debouncedValueModelChange$ = new Subject<any>();

  readonly lifespan = input('permanent', {
    transform: (v: string | undefined) => v ?? 'permanent',
  });
  lifespanOptions = [
    { value: 'all', viewValue: 'All' },
    { value: 'permanent', viewValue: 'Permanent' },
    { value: 'transient', viewValue: 'Transient' },
  ];

  readonly status = input('all', {
    transform: (v: string | undefined) => v ?? 'all',
  });
  statusOptions = [
    { value: 'all', viewValue: 'All' },
    { value: 'success', viewValue: 'Success' },
    { value: 'failure', viewValue: 'Failure' },
  ];

  index = input(0, { transform: (v) => numberAttribute(v, 0) });
  size = input(10, { transform: (v) => numberAttribute(v, 10) });

  rangeStart = input(0, { transform: (v) => numberAttribute(v, 0) });
  rangeEnd = input(0, { transform: (v) => numberAttribute(v, 0) });

  range = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });

  sortActive = input('');
  sortDirection = input<SortDirection>('');
  destroyed = new Subject<void>();
  screenSize: 'narrow' | 'normal' = 'normal';

  // Create a map from breakpoints to css class
  displayNameMap = new Map<string, 'narrow' | 'normal'>([
    [Breakpoints.XSmall, 'narrow'],
    [Breakpoints.Small, 'narrow'],
    [Breakpoints.Medium, 'normal'],
    [Breakpoints.Large, 'normal'],
    [Breakpoints.XLarge, 'normal'],
  ]);

  intentionResource = httpResource<any>(() => {
    let whereClause: any = {
      ...(this.status() !== 'all'
        ? {
            'transaction.outcome': this.status(),
          }
        : {}),
    };
    if (this.field()) {
      if (this.field() === 'id') {
        whereClause = {
          ...whereClause,
          ...(this.value() ? { _id: this.value().trim() } : {}),
        };
      } else if (this.field() === 'service') {
        whereClause = {
          ...whereClause,
          ...(this.value()
            ? { 'actions.service.name': this.value().trim() }
            : {}),
        };
      } else if (this.field() === 'project') {
        whereClause = {
          ...whereClause,
          ...(this.value()
            ? { 'actions.service.project': this.value().trim() }
            : {}),
        };
      } else if (this.field() === 'action') {
        whereClause = {
          ...whereClause,
          ...(this.value() ? { 'actions.action': this.value().trim() } : {}),
        };
      } else if (this.field() === 'username') {
        whereClause = {
          ...whereClause,
          ...(this.value() ? { 'actions.user.name': this.value().trim() } : {}),
        };
      }
    }

    const rangeStart = this.rangeStart();
    const rangeEnd = this.rangeEnd();

    if (rangeStart && rangeEnd) {
      const start = new Date(rangeStart);
      const end = new Date(rangeEnd);
      whereClause = {
        ...whereClause,
        'transaction.start': {
          $gte: start,
          $lt: end,
        },
      };
    }

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
    // console.log(whereClause);

    return this.intentionApi.searchIntentionsArgs(
      JSON.stringify(whereClause),
      this.index() * this.size(),
      this.size(),
    );
  });

  constructor(
    private readonly router: Router,
    private readonly intentionApi: IntentionApiService,
  ) {
    inject(BreakpointObserver)
      .observe([
        Breakpoints.XSmall,
        Breakpoints.Small,
        Breakpoints.Medium,
        Breakpoints.Large,
        Breakpoints.XLarge,
      ])
      .pipe(takeUntil(this.destroyed))
      .subscribe((result) => {
        for (const query of Object.keys(result.breakpoints)) {
          if (result.breakpoints[query]) {
            this.screenSize = this.displayNameMap.get(query) ?? 'normal';
          }
        }
      });
    effect(() => {
      this.currentField = this.field();
      this.currentValue = this.value();
    });
    effect(() => {
      const start = this.rangeStart();
      const end = this.rangeEnd();
      if (start !== 0 && end !== 0) {
        const computedEnd = new Date(end);
        computedEnd.setDate(computedEnd.getDate() - 1);
        this.range.setValue(
          {
            start: new Date(start),
            end: computedEnd,
          },
          { emitEvent: false },
        );
      } else {
        this.range.setValue(
          {
            start: null,
            end: null,
          },
          { emitEvent: false },
        );
      }
    });
    this.range.valueChanges.subscribe(() => {
      const { start, end } = this.range.value;
      if (start && end) {
        // Add 1 day to end date to be inclusive of the day
        end.setDate(end.getDate() + 1);
        this.updateRoute({
          rangeStart: start.valueOf(),
          rangeEnd: end.valueOf(),
          index: 0,
        });
      }
    });
    this.debouncedValueModelChange$.pipe(debounceTime(1000)).subscribe(() => {
      this.updateFieldValue();
    });
  }

  ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
  }

  handlePageEvent(event: PageEvent) {
    this.updateRoute({
      index: event.pageIndex,
      size: event.pageSize,
    });
  }

  clear() {
    this.updateRoute({
      field: '',
      value: '',
      index: 0,
      rangeStart: 0,
      rangeEnd: 0,
      lifespan: 'permanent',
      status: 'all',
    });
  }

  updateFieldValue() {
    this.updateRoute({
      field: this.currentField,
      value: this.currentValue,
      index: 0,
    });
  }

  updateRoute(settingDelta: Partial<HistoryQuery>) {
    const settings: HistoryQuery = {
      field: this.field(),
      value: this.value(),
      lifespan: this.lifespan(),
      status: this.status(),
      rangeStart: this.rangeStart(),
      rangeEnd: this.rangeEnd(),
      sortActive: this.sortActive(),
      sortDirection: this.sortDirection(),
      index: this.index(),
      size: this.size(),
      refresh: 0,
      ...settingDelta,
    };

    this.router.navigate(
      [
        '/intention/history',
        {
          ...(settings.field ? { field: settings.field } : {}),
          ...(settings.value ? { value: settings.value } : {}),
          ...(settings.lifespan ? { lifespan: settings.lifespan } : {}),
          ...(settings.status ? { status: settings.status } : {}),
          ...(settings.rangeStart !== 0 && settings.rangeEnd !== 0
            ? { rangeStart: settings.rangeStart, rangeEnd: settings.rangeEnd }
            : {}),
          index: settings.index,
          size: settings.size,
          ...(settings.sortActive ? { sortActive: settings.sortActive } : {}),
          ...(settings.sortDirection
            ? { sortDirection: settings.sortDirection }
            : {}),
        },
      ],
      {
        replaceUrl: true,
      },
    );
  }

  viewIntention(id: string) {
    this.router.navigate([`/intention/${id}`], {
      replaceUrl: true,
    });
  }
}
