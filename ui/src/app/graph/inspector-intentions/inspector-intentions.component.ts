import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { IntentionApiService } from '../../service/intention-api.service';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { HistoryTableComponent } from '../../intention/history-table/history-table.component';

@Component({
  selector: 'app-inspector-intentions',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDividerModule,
    MatExpansionModule,
    MatListModule,
    HistoryTableComponent,
  ],
  templateUrl: './inspector-intentions.component.html',
  styleUrls: ['./inspector-intentions.component.scss'],
})
export class InspectorIntentionsComponent implements OnChanges {
  @Input() id!: string;
  @Input() name!: string;
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
