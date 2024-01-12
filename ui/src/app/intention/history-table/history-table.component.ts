import { Component, Input, OnChanges, OnInit } from '@angular/core';
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
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import {
  MatSnackBar,
  MatSnackBarModule,
  MatSnackBarConfig,
} from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import prettyMilliseconds from 'pretty-ms';
import { switchMap } from 'rxjs';

import { GraphUtilService } from '../../service/graph-util.service';
import { CollectionApiService } from '../../service/collection-api.service';
import { GanttGraphComponent } from '../gantt-graph/gantt-graph.component';
import { ActionContentComponent } from '../action-content/action-content.component';
import { FilesizePipe } from '../../util/filesize.pipe';
import { CollectionDtoRestUnion } from '../../service/dto/collection-dto-union.type';

@Component({
  selector: 'app-history-table',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatTableModule,
    MatSnackBarModule,
    ActionContentComponent,
    FilesizePipe,
    GanttGraphComponent,
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
export class HistoryTableComponent implements OnInit, OnChanges {
  @Input() intentionData: any[] = [];
  @Input() layout: 'narrow' | 'normal' = 'normal';
  @Input() showHeader = true;
  @Input() openFirst = false;

  propDisplayedColumns: string[] = [
    'project',
    'service',
    'action',
    'start',
    'outcome',
    'reason',
    'user',
  ];
  propDisplayedColumnsWithExpand: string[] = [
    ...this.propDisplayedColumns,
    'expand',
  ];
  expandedElement: any | null;

  constructor(
    private readonly router: Router,
    private readonly collectionApi: CollectionApiService,
    private readonly graphUtil: GraphUtilService,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnChanges(): void {
    if (
      this.intentionData.length === 1 ||
      (this.openFirst && this.intentionData.length > 0)
    ) {
      this.expandedElement = this.intentionData[0];
    }
  }

  ngOnInit(): void {
    if (this.layout === 'narrow') {
      this.propDisplayedColumns = ['start-narrow', 'open'];
      this.propDisplayedColumnsWithExpand = [
        ...this.propDisplayedColumns,
        'expand',
      ];
    }
  }

  viewIntention(id: string) {
    this.router.navigate([
      '/intention/history',
      {
        index: 0,
        size: 10,
        field: 'id',
        value: id,
        status: 'all',
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

  totalDuration(intention: any) {
    return intention.transaction.duration
      ? prettyMilliseconds(intention.transaction.duration)
      : 0;
  }

  openCollection(
    collection: keyof CollectionDtoRestUnion,
    key: string,
    value: string,
  ) {
    this.collectionApi
      .doUniqueKeyCheck(collection, key, value)
      .pipe(
        switchMap((ids) => {
          if (ids.length === 1) {
            return this.collectionApi.getCollectionById(collection, ids[0]);
          }
          const config = new MatSnackBarConfig();
          config.duration = 5000;
          config.verticalPosition = 'bottom';
          this.snackBar.open(
            `The ${collection} was not found.`,
            'Dismiss',
            config,
          );
          throw new Error(`The ${collection} was not found`);
        }),
      )
      .subscribe((collection) => {
        this.graphUtil.openInGraph(collection.vertex, 'vertex');
      });
    return false;
  }
}
