import { Component, EventEmitter, Output, computed, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ActionContentComponent } from '../action-content/action-content.component';
import { OutcomeIconComponent } from '../../shared/outcome-icon/outcome-icon.component';
import { IntentionUtilService } from '../../util/intention-util.service';

@Component({
  selector: 'app-history-table',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatTableModule,
    MatTooltipModule,
    ActionContentComponent,
    OutcomeIconComponent,
  ],
  templateUrl: './history-table.component.html',
  styleUrl: './history-table.component.scss',
})
export class HistoryTableComponent {
  intentionUtil = inject(IntentionUtilService);

  readonly intentionData = input<any[]>([]);
  readonly layout = input<'narrow' | 'normal'>('normal');
  readonly showHeader = input(true);
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
        'menu',
      ];
    }
  });

  navigateHistoryById(id: string) {
    this.viewIntentionEvent.emit(id);
  }
}
