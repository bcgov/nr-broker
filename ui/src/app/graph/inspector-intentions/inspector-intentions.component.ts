import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { GraphApiService } from '../../service/graph-api.service';

@Component({
  selector: 'app-inspector-intentions',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDividerModule, MatListModule],
  templateUrl: './inspector-intentions.component.html',
  styleUrls: ['./inspector-intentions.component.scss'],
})
export class InspectorIntentionsComponent implements OnChanges {
  @Input() name!: string;
  intentions: any[] = [];
  total = 0;

  constructor(
    private readonly graphApi: GraphApiService,
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

  navigateHistoryById(id: string) {
    this.router.navigate([
      '/intention/history',
      {
        field: 'id',
        value: id,
      },
    ]);
  }

  private loadIntentions() {
    this.graphApi
      .searchIntentions({ 'actions.service.name': this.name }, 0, 5)
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
