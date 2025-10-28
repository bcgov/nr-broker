import { Component, EventEmitter, inject, input, Output, OnDestroy } from '@angular/core';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { httpResource } from '@angular/common/http';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { CollectionApiService } from '../../service/collection-api.service';
import { CollectionUtilService } from '../../service/collection-util.service';
import { PackageUtilService } from '../../service/package-util.service';
import { GraphUtilService } from '../../service/graph-util.service';
import { CollectionDtoUnion } from '../../service/persistence/dto/collection-dto-union.type';
import { IntentionDto } from '../../service/intention/dto/intention.dto';
import { GanttGraphComponent } from '../gantt-graph/gantt-graph.component';
import { FilesizePipe } from '../../util/filesize.pipe';
import { BrokerAccountDto } from '../../service/persistence/dto/broker-account.dto';
import { DetailsItemComponent } from '../../shared/details-item/details-item.component';
import { ActionContentComponent } from '../action-content/action-content.component';
import { IntentionUtilService } from '../../util/intention-util.service';
import { OutcomeIconComponent } from '../../shared/outcome-icon/outcome-icon.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-intention-details',
  imports: [
    ClipboardModule,
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatTooltipModule,
    GanttGraphComponent,
    FilesizePipe,
    ActionContentComponent,
    DetailsItemComponent,
    OutcomeIconComponent,
  ],
  templateUrl: './intention-details.component.html',
  styleUrl: './intention-details.component.scss',
})
export class IntentionDetailsComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly collectionApi = inject(CollectionApiService);
  private readonly collectionUtil = inject(CollectionUtilService);
  private readonly graphUtil = inject(GraphUtilService);
  private readonly packageUtil = inject(PackageUtilService);
  private readonly snackBar = inject(MatSnackBar);
  readonly intentionUtil = inject(IntentionUtilService);

  screenSize: 'narrow' | 'normal' = 'normal';
  intention = input.required<IntentionDto>();

  displayNameMap = new Map<string, 'narrow' | 'normal'>([
    [Breakpoints.XSmall, 'narrow'],
    [Breakpoints.Small, 'narrow'],
    [Breakpoints.Medium, 'normal'],
    [Breakpoints.Large, 'normal'],
    [Breakpoints.XLarge, 'normal'],
  ]);
  destroyed = new Subject<void>();

  brokerAccountResource = httpResource<BrokerAccountDto>(() => {
    const accountId = this.intention().accountId;
    if (accountId) {
      return this.collectionApi.getCollectionByIdArgs(
        'brokerAccount',
        accountId,
      );
    } else {
      return undefined;
    }
  });
  @Output() viewIntentionEvent = new EventEmitter<string>();

  constructor() {
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
            // console.log('Screen size changed to:', this.screenSize);
          }
        }
      });
  }

  ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
  }

  async openPackageBuildVersion(id: string | undefined, version: string) {
    if (!id) {
      return;
    }
    this.collectionApi.getCollectionById('service', id).subscribe((service) => {
      return this.packageUtil.openPackageBuildVersion(service.vertex, version);
    });
  }

  viewPackage(action: any) {
    this.collectionUtil.openServicePackage(
      action.service.id,
      action.package.id,
    );
  }

  viewIntention(id: string | undefined) {
    if (!id) {
      return;
    }
    this.viewIntentionEvent.emit(id);
  }

  openBrokerAccountHistory(id: string) {
    this.router.navigate([
      `/intention/history`,
      { field: 'account', value: id },
    ]);
  }

  openCollectionFromAction(
    $event: MouseEvent,
    collection: keyof CollectionDtoUnion,
    key: string,
    path: string,
  ) {
    const values = [
      ...this.intentionUtil.actionValueSet(this.intention(), path),
    ];

    if (values.length === 0) {
      this.openSnackBar(`No values found for ${path}`);
      $event.stopPropagation();
      return false;
    }

    if (values.length === 1) {
      this.openCollection($event, collection, key, values[0]);
      $event.stopPropagation();
      return false;
    }
    return false;
  }

  openCollection(
    $event: MouseEvent | Event,
    collection: keyof CollectionDtoUnion,
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
          this.openSnackBar(`The ${collection} was not found.`);
          throw new Error(`The ${collection} was not found`);
        }),
      )
      .subscribe((collectionDto) => {
        if ('altKey' in $event && ($event as MouseEvent).altKey) {
          this.graphUtil.openInGraph(collectionDto.vertex, 'vertex');
        } else {
          this.router.navigate([`/browse/${collection}/${collectionDto.id}`]);
        }
      });
    return false;
  }

  navigateHistoryById(id: string | undefined) {
    if (!id) {
      return;
    }
    this.router.navigate([
      '/intention/history',
      {
        field: 'id',
        value: id,
      },
    ]);
  }

  getActionValue(action: any, path: string): string {
    return this.intentionUtil.actionValue(action, path) ?? 'undefined';
  }

  private openSnackBar(message: string) {
    const config = new MatSnackBarConfig();
    config.duration = 5000;
    config.verticalPosition = 'bottom';
    this.snackBar.open(message, 'Dismiss', config);
  }
}
