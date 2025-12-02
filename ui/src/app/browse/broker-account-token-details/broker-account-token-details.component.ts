import { Component, computed, inject, input, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { httpResource } from '@angular/common/http';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';
import { CollectionApiService } from '../../service/collection-api.service';
import { CollectionHeaderComponent } from '../../shared/collection-header/collection-header.component';
import { AccountGenerateDialogComponent } from '../../graph/account-generate-dialog/account-generate-dialog.component';
import { AccountRevokeDialogComponent } from '../../graph/account-revoke-dialog/account-revoke-dialog.component';
import { InspectorAccountComponent } from '../../graph/inspector-account/inspector-account.component';
import { BrokerAccountDto } from '../../service/persistence/dto/broker-account.dto';
import { ScreenService } from '../../util/screen.service';
import { GraphApiService } from '../../service/graph-api.service';
import { SystemApiService } from '../../service/system-api.service';
import { UserPermissionDto } from '../../service/persistence/dto/user-permission.dto';
import { PermissionService } from '../../service/permission.service';
import { InspectorAccountChartComponent } from '../../graph/inspector-account-chart/inspector-account-chart.component';

@Component({
  selector: 'app-broker-account-token-details',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    CollectionHeaderComponent,
    InspectorAccountComponent,
    InspectorAccountChartComponent,
  ],
  templateUrl: './broker-account-token-details.component.html',
  styleUrl: './broker-account-token-details.component.scss',
})
export class BrokerAccountTokenDetailsComponent {
  private readonly dialog = inject(MatDialog);
  private readonly collectionApi = inject(CollectionApiService);
  private readonly graphApi = inject(GraphApiService);
  private readonly systemApi = inject(SystemApiService);
  private readonly permission = inject(PermissionService);
  protected readonly screen = inject(ScreenService);

  id = input.required<string>();

  accountResource = httpResource<BrokerAccountDto>(() => {
    return this.collectionApi.getCollectionByIdArgs('brokerAccount', this.id());
  });
  userPermissionResource = httpResource<UserPermissionDto>(() => {
    return this.graphApi.getUserPermissionsArgs();
  });

  hasSudo = computed(() => {
    if (this.accountResource.hasValue() && this.userPermissionResource.hasValue()) {
      const permissions = this.userPermissionResource.value();
      // Logic to determine if the user has sudo permissions
      return this.permission.hasSudo(
        permissions,
        this.accountResource.value().vertex,
      );
    }
    return false;
  });

  collection = signal<CollectionNames>('brokerAccount');
  showHelp = signal(false);

  openGenerateDialog() {
    this.dialog
      .open(AccountGenerateDialogComponent, {
        width: '600px',
        data: {
          accountId: this.id(),
        },
      })
      .afterClosed()
      .subscribe();
  }

  openRevokeDialog() {
    this.dialog
      .open(AccountRevokeDialogComponent, {
        width: '500px',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result && result.confirm) {
          this.systemApi.revokeAccountToken(this.id()).subscribe({
            next: () => {
              // Token revoked successfully - refresh will happen via SSE event
              this.accountResource.reload();
            },
            error: (error) => {
              console.error('Failed to revoke token:', error);
            },
          });
        }
      });
  }
}
