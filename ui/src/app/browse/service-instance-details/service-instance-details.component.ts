import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

import { IntentionActionPointerRestDto } from '../../service/dto/intention-action-pointer-rest.dto';
import { OutcomeIconComponent } from '../../shared/outcome-icon/outcome-icon.component';
import { CollectionUtilService } from '../../service/collection-util.service';
import { CollectionNames } from '../../service/dto/collection-dto-union.type';
import { GraphPropViewerDialogComponent } from '../graph-prop-viewer-dialog/graph-prop-viewer-dialog.component';

@Component({
  selector: 'app-service-instance-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatRippleModule,
    MatSelectModule,
    OutcomeIconComponent,
  ],
  templateUrl: './service-instance-details.component.html',
  styleUrl: './service-instance-details.component.scss',
})
export class ServiceInstanceDetailsComponent {
  @Input() instance!: any | undefined;
  @Input() showName!: boolean;
  serverSelection: any | undefined;

  current: IntentionActionPointerRestDto | undefined;

  constructor(
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly collectionUtil: CollectionUtilService,
    private readonly router: Router,
  ) {}

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
