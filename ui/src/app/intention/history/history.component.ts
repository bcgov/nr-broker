import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { IntentionApiService } from '../../service/intention-api.service';
import { ActionContentComponent } from '../action-content/action-content.component';
import { Subject, switchMap } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
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
    private route: ActivatedRoute,
    private router: Router,
    private intentionApi: IntentionApiService,
  ) {}

  ngOnInit(): void {
    this.triggerRefresh
      .pipe(
        switchMap(() => {
          this.loading = true;
          return this.intentionApi.searchIntentions(
            JSON.stringify({}),
            this.pageIndex * this.pageSize,
            this.pageSize,
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
    this.refresh();
  }

  ngOnDestroy() {
    this.triggerRefresh.complete();
  }

  handlePageEvent(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;

    this.router.navigate(
      ['/intention/history', { index: this.pageIndex, size: this.pageSize }],
      {
        replaceUrl: true,
      },
    );
    this.refresh();
  }

  refresh() {
    this.triggerRefresh.next();
  }
}
