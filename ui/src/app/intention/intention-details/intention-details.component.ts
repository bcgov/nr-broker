import { Component, EventEmitter, input, Output } from '@angular/core';
import prettyMilliseconds from 'pretty-ms';
import { switchMap } from 'rxjs';
import { Router } from '@angular/router';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { CollectionApiService } from '../../service/collection-api.service';
import { CollectionUtilService } from '../../service/collection-util.service';
import { PackageUtilService } from '../../service/package-util.service';
import { GraphUtilService } from '../../service/graph-util.service';
import { CollectionDtoUnion } from '../../service/persistence/dto/collection-dto-union.type';
import { IntentionDto } from '../../service/intention/dto/intention.dto';
import { GanttGraphComponent } from '../gantt-graph/gantt-graph.component';
import { FilesizePipe } from '../../util/filesize.pipe';

@Component({
  selector: 'app-intention-details',
  imports: [
    ClipboardModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    GanttGraphComponent,
    FilesizePipe,
  ],
  templateUrl: './intention-details.component.html',
  styleUrl: './intention-details.component.scss',
})
export class IntentionDetailsComponent {
  layout = input<'narrow' | 'normal'>('normal');
  intention = input.required<IntentionDto>();
  @Output() viewIntentionEvent = new EventEmitter<string>();

  constructor(
    private readonly router: Router,
    private readonly collectionApi: CollectionApiService,
    private readonly collectionUtil: CollectionUtilService,
    private readonly graphUtil: GraphUtilService,
    private readonly packageUtil: PackageUtilService,
    private readonly snackBar: MatSnackBar,
  ) {}

  totalDuration(intention: any) {
    return intention.transaction.duration
      ? prettyMilliseconds(intention.transaction.duration)
      : 0;
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

  openCollection(
    $event: MouseEvent,
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
        if ($event.altKey) {
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

  private openSnackBar(message: string) {
    const config = new MatSnackBarConfig();
    config.duration = 5000;
    config.verticalPosition = 'bottom';
    this.snackBar.open(message, 'Dismiss', config);
  }
}
