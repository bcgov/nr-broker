import { Component, Input, OnChanges, OnInit, input, inject } from '@angular/core';
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
export class ServiceInstanceDetailsComponent implements OnInit, OnChanges {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly collectionUtil = inject(CollectionUtilService);
  private readonly router = inject(Router);

  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() instance!: any | undefined;
  readonly showName = input.required<boolean>();
  serverSelection: any | undefined;

  current: IntentionActionPointerDto | undefined;

  ngOnChanges(): void {
    this.ngOnInit();
  }

  ngOnInit(): void {
    this.current = this.instance?.action;
    if (this.instance?.server) {
      this.serverSelection = this.instance.server[0];
    }
  }

  open() {
    this.collectionUtil.openInBrowser('serviceInstance', this.instance.id);
  }

  openServicePackage(packageId: string) {
    this.collectionUtil.openServicePackage(
      this.current?.source?.action.service.id,
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
