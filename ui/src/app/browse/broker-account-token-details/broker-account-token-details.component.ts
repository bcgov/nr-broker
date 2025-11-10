import { Component, computed, inject, input, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';
import { CollectionApiService } from '../../service/collection-api.service';
import { CollectionHeaderComponent } from '../../shared/collection-header/collection-header.component';
import { MatCardModule } from '@angular/material/card';
import { AccountGenerateDialogComponent } from '../../graph/account-generate-dialog/account-generate-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { InspectorAccountComponent } from '../../graph/inspector-account/inspector-account.component';
import { BrokerAccountDto } from '../../service/persistence/dto/broker-account.dto';
import { httpResource } from '@angular/common/http';
import { ScreenService } from '../../util/screen.service';
import { GraphApiService } from '../../service/graph-api.service';
import { UserPermissionDto } from '../../service/persistence/dto/user-permission.dto';
import { PermissionService } from '../../service/permission.service';

@Component({
  selector: 'app-broker-account-token-details',
  imports: [
    CollectionHeaderComponent,
    InspectorAccountComponent,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './broker-account-token-details.component.html',
  styleUrl: './broker-account-token-details.component.scss',
})
export class BrokerAccountTokenDetailsComponent {
  private readonly dialog = inject(MatDialog);
  // private readonly activatedRoute = inject(ActivatedRoute);
  private readonly collectionApi = inject(CollectionApiService);
  private readonly graphApi = inject(GraphApiService);
  private readonly permission = inject(PermissionService);
  readonly screen = inject(ScreenService);
  // readonly hasSudo = input(false);
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
  id = input.required<string>();
  name = signal('');
  loading = signal(true);

  // constructor() {
  //   this.activatedRoute.params.subscribe((params) => {
  //     combineLatest([
  //       this.collectionApi.getCollectionById(this.collection(), this.id()),
  //     ]).subscribe(([brokerAccount]) => {
  //       console.log('Broker Account:', brokerAccount);
  //       this.name.set(brokerAccount.name);
  //       this.loading.set(false);
  //     });
  //   });
  // }

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
}
