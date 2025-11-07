import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { combineLatest } from 'rxjs';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';
import { CollectionApiService } from '../../service/collection-api.service';
import { CollectionHeaderComponent } from '../../shared/collection-header/collection-header.component';
import { BreakpointBaseComponent } from '../../shared/breakpoint-base/breakpoint-base.component';

@Component({
  selector: 'app-broker-account-token-details',
  imports: [
    CollectionHeaderComponent,
    MatProgressSpinnerModule,
  ],
  templateUrl: './broker-account-token-details.component.html',
  styleUrl: './broker-account-token-details.component.scss',
})
export class BrokerAccountTokenDetailsComponent extends BreakpointBaseComponent {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly collectionApi = inject(CollectionApiService);

  collection = signal<CollectionNames>('brokerAccount');
  brokerAccountId = signal<string>('');
  name = signal('');
  loading = signal(true);

  constructor() {
    super();
    this.activatedRoute.params.subscribe((params) => {
      this.brokerAccountId.set(params['id']);
      combineLatest([
        this.collectionApi.getCollectionById(this.collection(), this.brokerAccountId()),
      ]).subscribe(([brokerAccount]) => {
        console.log('Broker Account:', brokerAccount);
        this.name.set(brokerAccount.name);
        this.loading.set(false);
      });
    });
  }
}
