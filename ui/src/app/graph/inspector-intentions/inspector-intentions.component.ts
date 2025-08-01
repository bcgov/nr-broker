import { Component, OnChanges, SimpleChanges, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';

import { IntentionApiService } from '../../service/intention-api.service';
import { HistoryTableComponent } from '../../intention/history-table/history-table.component';

@Component({
  selector: 'app-inspector-intentions',
  imports: [
    CommonModule,
    MatButtonModule,
    MatExpansionModule,
    MatListModule,
    HistoryTableComponent,
  ],
  templateUrl: './inspector-intentions.component.html',
  styleUrls: ['./inspector-intentions.component.scss'],
})
export class InspectorIntentionsComponent implements OnChanges {
  readonly id = input.required<string>();
  readonly name = input.required<string>();
  readonly collection = input.required<string>();
  readonly layout = input<'narrow' | 'normal'>('narrow');
  readonly showMore = input<boolean>(true);
  readonly showHeader = input<boolean>(false);
  intentions: any[] = [];
  total = 0;
  limit = 10;

  constructor(
    private readonly intentionApi: IntentionApiService,
    private readonly router: Router,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['name']) {
      this.loadIntentions();
    }
  }

  navigateHistory() {
    this.router.navigate([
      '/intention/history',
      {
        lifespan: 'all',
        ...(this.collection() === 'service'
          ? {
              field: 'service',
              value: this.name(),
            }
          : {
              field: 'account',
              value: this.id(),
            }),
      },
    ]);
  }

  viewIntention(event: any) {
    this.router.navigate([`/intention/${event}`]);
  }

  private loadIntentions() {
    this.intentionApi
      .searchIntentions(
        JSON.stringify(
          this.collection() === 'service'
            ? { 'actions.service.id': this.id() }
            : { accountId: this.id() },
        ),
        0,
        this.limit,
      )
      .subscribe((data) => {
        if (data) {
          this.intentions = data.data;
          this.total = data.meta.total;
        } else {
          this.intentions = [];
          this.total = 0;
        }
      });
  }
}
