import { Component, OnDestroy, input, inject, computed, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import {
  MatSnackBar,
  MatSnackBarModule,
  MatSnackBarConfig,
} from '@angular/material/snack-bar';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { SystemApiService } from '../../service/system-api.service';
import { BrokerAccountDto } from '../../service/persistence/dto/broker-account.dto';
import { JwtRegistryDto } from '../../service/persistence/dto/jwt-registry.dto';
import { CollectionUtilService } from '../../service/collection-util.service';
import { InspectorAccountTableComponent } from '../inspector-account-table/inspector-account-table.component';

@Component({
  selector: 'app-inspector-account',
  imports: [
    CommonModule,
    ClipboardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSnackBarModule,
    MatProgressSpinner,
    MatExpansionModule,
    MatSlideToggleModule,
    InspectorAccountTableComponent,
  ],
  templateUrl: './inspector-account.component.html',
  styleUrls: ['./inspector-account.component.scss'],
})
export class InspectorAccountComponent implements OnInit, OnDestroy {
  private readonly snackBar = inject(MatSnackBar);
  private readonly systemApi = inject(SystemApiService);
  private readonly collectionUtil = inject(CollectionUtilService);

  readonly account = input.required<BrokerAccountDto>();
  readonly display = input<'table' | 'details'>('table');
  readonly hasSudo = input(false);
  readonly showHelp = input(false);

  readonly accountTokensResource = httpResource<JwtRegistryDto[]>(() => {
    return this.systemApi.getAccountTokensArgs(this.account().id);
  },
  {
    defaultValue: [],
  });
  // readonly accountUsageResource = httpResource<HistogramSeriesDto>(() => {
  //   return this.systemApi.getAccountUsageArgs(this.account().id);
  // });
  lastJwtToken = computed(() => {
    return this.last(this.accountTokensResource.value());
  });
  prevJwtToken = computed(() => {
    return this.secondLast(this.accountTokensResource.value());
  });

  private tokenToData(token: JwtRegistryDto) {
    const data: { key: string; value: any; hint: string }[] = [
      {
        key: 'JTI',
        value: token.claims.jti,
        hint: 'A unique identifier for a specific token used to track and support revocations',
      },
      {
        key: 'Expiry',
        value: new Date(token.claims.exp * 1000),
        hint: 'The date and time at which the token expires',
      },
    ];
    if (this.display() === 'details') {
      data.push(
        {
          key: 'Blocked',
          value: token.blocked,
          hint: 'The token revocation status',
        },
      );
      data.push(
        {
          key: 'Issued At',
          value: token.createdAt,
          hint: 'The date and time when the token was created',
        },
      );
      if (token.lastUsedAt) {
        data.push(
          {
            key: 'Last Used At',
            value: token.lastUsedAt,
            hint: 'The date and time when the token was last used',
          },
        );
      }
      data.push(
        {
          key: 'Client Id',
          value: token.claims.client_id,
          hint: 'The broker account\'s unique indentifier that all tokens generated for it share',
        },
      );
    }
    return data;
  }

  lastJwtTokenData = computed(() => {
    const lastJwtToken = this.lastJwtToken();
    // const hourlyUsage = this.hasSudo() && this.accountUsageResource.hasValue()
    // ? this.accountUsageResource.value()
    // : undefined;
    if (!lastJwtToken) {
      return undefined;
    }
    return this.tokenToData(lastJwtToken);
  });
  // hasPrevJwtToken<T>(): Exclude<T, T | undefined> {
  //   return !!this.prevJwtToken();
  // }
  prevJwtTokenData = computed(() => {
    const prevJwtToken = this.prevJwtToken();
    if (!prevJwtToken) {
      return undefined;
    }
    return this.tokenToData(prevJwtToken);
  });
  jtiValue = computed(() => {
    const lastJwtToken = this.lastJwtToken();
    if (!lastJwtToken) {
      return 'undefined';
    }
    return lastJwtToken.claims.jti;
  });

  propDisplayedColumns: string[] = ['key', 'value'];

  private tokenUpdateSubscription: Subscription | undefined;

  ngOnInit(): void {
    this.tokenUpdateSubscription = this.systemApi
      .createAccountTokenEventSource()
      .subscribe({
        next: (data: any) => {
          if (data.clientId === this.account().clientId) {
            this.openSnackBar('The token was generated.');
            this.accountTokensResource.reload();
          }
        },
        error: (error: any) => {
          console.error('Error receiving token update events:', error);
        },
      });
  }

  ngOnDestroy(): void {
    // Unsubscribe
    if (this.tokenUpdateSubscription) {
      this.tokenUpdateSubscription.unsubscribe();
    }
  }

  isDateExpired(test: Date) {
    return Date.now() > test.valueOf();
  }

  openAccessToken() {
    this.collectionUtil.openAccessToken(this.account().id);
  }

  openBrokerAccountHistory() {
    this.collectionUtil.openBrokerAccountHistory(this.account().id);
  }

  sync(): void {
    const account = this.account();
    if (account) {
      this.systemApi.brokerAccountRefresh(account.id).subscribe({
        next: () => {
          this.openSnackBar('Sync of secrets queued');
        },
        error: (err: any) => {
          this.openSnackBar(
            'Syncing token failed: ' + (err?.statusText ?? 'unknown'),
          );
        },
      });
    } else {
      this.openSnackBar('The account does not exist!');
    }
  }

  private openSnackBar(message: string) {
    const config = new MatSnackBarConfig();
    config.duration = 5000;
    config.verticalPosition = 'bottom';
    this.snackBar.open(message, 'Dismiss', config);
  }

  // Array util
  private last<T>(arr: T[]): T | undefined {
    return arr.length ? arr[arr.length - 1] : undefined;
  }

  private secondLast<T>(arr: T[]): T | undefined {
    return arr.length > 1 ? arr[arr.length - 2] : undefined;
  }
}
