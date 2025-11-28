import { Component, input, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

import { IntentionActionPointerDto } from '../../service/persistence/dto/intention-action-pointer.dto';
import { CollectionUtilService } from '../../service/collection-util.service';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';
import { GraphPropViewerDialogComponent } from '../graph-prop-viewer-dialog/graph-prop-viewer-dialog.component';
import { DetailsItemComponent } from '../../shared/details-item/details-item.component';

@Component({
  selector: 'app-service-instance-details',
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    DetailsItemComponent,
  ],
  templateUrl: './service-instance-details.component.html',
  styleUrl: './service-instance-details.component.scss',
})
export class ServiceInstanceDetailsComponent {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly collectionUtil = inject(CollectionUtilService);
  private readonly router = inject(Router);

  public readonly instance = input.required<any>();
  public readonly showName = input.required<boolean>();

  public readonly action = computed<IntentionActionPointerDto | undefined>(() => {
    return this.instance()?.action;
  });
  public readonly serverIndex = signal<number>(0);
  public readonly selectedServer = computed(() => {
    return this.instance()?.server[this.serverIndex()];
  });

  onServerSelectionChange(index: number) {
    this.serverIndex.set(index);
  }

  open() {
    this.collectionUtil.openInBrowser(
      'serviceInstance',
      this.instance().id,
    );
  }

  openServicePackage(packageId: string) {
    this.collectionUtil.openServicePackage(
      this.action()?.source?.action.service.id,
      packageId,
    );
  }

  openInBrowser(collection: CollectionNames, id: string) {
    this.collectionUtil.openInBrowser(collection, id);
  }

  openUserInBrowserByGuid(guid: string) {
    try {
      this.collectionUtil.openUserInBrowserByGuid(guid);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      const config = new MatSnackBarConfig();
      config.duration = 5000;
      config.verticalPosition = 'bottom';
      this.snackBar.open('User not found', 'Dismiss', config);
    }
  }

  openInstancePropertyDialog(prop: any) {
    this.dialog.open(GraphPropViewerDialogComponent, {
      width: '500px',
      data: { prop },
    });
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
}
