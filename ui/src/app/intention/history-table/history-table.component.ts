import {
  Component,
  EventEmitter,
  OnChanges,
  Output,
  computed,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import prettyMilliseconds from 'pretty-ms';

import { ActionContentComponent } from '../action-content/action-content.component';
import { OutcomeIconComponent } from '../../shared/outcome-icon/outcome-icon.component';
import { IntentionDetailsComponent } from '../intention-details/intention-details.component';

@Component({
  selector: 'app-history-table',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
    ActionContentComponent,
    IntentionDetailsComponent,
    OutcomeIconComponent,
  ],
  templateUrl: './history-table.component.html',
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
  styleUrl: './history-table.component.scss',
})
export class HistoryTableComponent implements OnChanges {
  readonly intentionData = input<any[]>([]);
  readonly layout = input<'narrow' | 'normal'>('normal');
  readonly showHeader = input(true);
  readonly openFirst = input(false);
  readonly actionServiceFilter = input('');
  @Output() viewIntentionEvent = new EventEmitter<string>();

  readonly propDisplayedColumns = computed(() => {
    if (this.layout() === 'narrow') {
      return ['service', 'start-narrow', 'environment'];
    } else {
      return [
        'project',
        'service',
        'action',
        'action-icon',
        'start',
        'outcome',
        'reason',
        'environment',
        'user',
      ];
    }
  });
  readonly propDisplayedColumnsWithExpand = computed(() => {
    return [...this.propDisplayedColumns(), 'expand'];
  });
  expandedElement: any | null;

  constructor(private readonly router: Router) {}

  ngOnChanges(): void {
    const intentionData = this.intentionData();
    if (
      intentionData.length === 1 ||
      (this.openFirst() && intentionData.length > 0)
    ) {
      this.expandedElement = intentionData[0];
    }
  }

  navigateHistoryById(id: string) {
    this.viewIntentionEvent.emit(id);
  }

  totalDuration(intention: any) {
    return intention.transaction.duration
      ? prettyMilliseconds(intention.transaction.duration)
      : 0;
  }

  normalizedProgress(intention: any) {
    let progressCnt = 0;
    if (intention.actions) {
      progressCnt = intention.actions.reduce(
        (currentValue: number, action: any) => {
          if (action.trace.outcome) {
            return 2 + currentValue;
          } else if (action.trace.start) {
            return 1 + currentValue;
          }
          return currentValue;
        },
        0,
      );
    }
    return Math.round((progressCnt / (intention.actions.length * 2)) * 100);
  }
}
