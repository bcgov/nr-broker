import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
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
    styleUrls: ['./inspector-intentions.component.scss']
})
export class InspectorIntentionsComponent implements OnChanges {
  @Input() id!: string;
  @Input() name!: string;
  @Input() layout: 'narrow' | 'normal' = 'narrow';
  @Input() showMore: boolean = true;
  @Input() showHeader: boolean = false;
  @Input() openFirst: boolean = true;
  intentions: any[] = [];
  total = 0;

  constructor(
    private readonly intentionApi: IntentionApiService,
    private readonly router: Router,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['name']) {
      this.loadIntentions();
    }
  }

  navigateHistoryByService() {
    this.router.navigate([
      '/intention/history',
      {
        field: 'service',
        value: this.name,
      },
    ]);
  }

  viewIntention(event: any) {
    this.router.navigate([
      '/intention/history',
      {
        field: 'id',
        value: event,
      },
    ]);
  }

  private loadIntentions() {
    this.intentionApi
      .searchIntentions(JSON.stringify({ 'actions.service.id': this.id }), 0, 5)
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
