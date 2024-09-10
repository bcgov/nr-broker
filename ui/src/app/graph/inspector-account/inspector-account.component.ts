import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';

import { AccountGenerateDialogComponent } from '../account-generate-dialog/account-generate-dialog.component';
import { SystemApiService } from '../../service/system-api.service';
import { BrokerAccountRestDto } from '../../service/dto/broker-account-rest.dto';
import { JwtRegistryDto } from '../../service/dto/jwt-registry-rest.dto';
import { GraphApiService } from '../../service/graph-api.service';

@Component({
  selector: 'app-inspector-account',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './inspector-account.component.html',
  styleUrls: ['./inspector-account.component.scss'],
})
export class InspectorAccountComponent implements OnChanges, OnInit, OnDestroy {
  @Input() account!: BrokerAccountRestDto;
  @Input() userIndex!: number | undefined;
  @Input() hasSudo = false;

  jwtTokens: JwtRegistryDto[] | undefined;
  lastJwtTokenData: any;
  expired = false;
  private requestedAccountId?: string;
  hourlyUsage:
    | {
        success: number;
        unknown: number;
        failure: number;
      }
    | undefined;
  propDisplayedColumns: string[] = ['key', 'value'];

  private tokenUpdateSubscription: Subscription | undefined;

  constructor(
    private readonly dialog: MatDialog,
    private readonly systemApi: SystemApiService,
    private readonly graphApi: GraphApiService,
  ) {}

  ngOnInit(): void {
    this.tokenUpdateSubscription = this.graphApi
      .createTokenUpdatedEventSource()
      .subscribe({
        next: () => {
          this.updateAccount();
        },
        error: (error) => {
          console.error('Error receiving token update events:', error);
        },
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['account']) {
      this.updateAccount();
    }
  }

  ngOnDestroy(): void {
    // Unsubscribe
    if (this.tokenUpdateSubscription) {
      this.tokenUpdateSubscription.unsubscribe();
    }
  }

  openGenerateDialog() {
    this.dialog
      .open(AccountGenerateDialogComponent, {
        width: '600px',
        data: {
          accountId: this.account.id,
        },
      })
      .afterClosed()
      .subscribe(() => {
        this.requestedAccountId = undefined;
        this.updateAccount();
      });
  }

  refresh(): void {
    if (this.account && this.userIndex) {
      this.systemApi.refresh(this.account.id).subscribe({
        next: (response: any) => {
          console.log('Token synced successfully', response);
        },
        error: (err: any) => {
          console.error('Syncing token failed:', err);
        },
      });
    } else console.log('The account does not exist!');
  }

  private updateAccount(): void {
    if (this.account && this.userIndex) {
      if (this.account.id === this.requestedAccountId) {
        return;
      }
      this.requestedAccountId = this.account.id;
      this.jwtTokens = undefined;
      this.lastJwtTokenData = undefined;
      this.systemApi.getAccountTokens(this.account.id).subscribe({
        next: (data: JwtRegistryDto[]) => {
          this.jwtTokens = data;
          const lastJwtToken = this.jwtTokens.pop();
          if (lastJwtToken) {
            this.lastJwtTokenData = {
              JTI: lastJwtToken.claims.jti,
              Expiry: new Date(lastJwtToken.claims.exp * 1000),
            };
            if (this.hourlyUsage) {
              this.lastJwtTokenData.Usage = this.hourlyUsage;
            }

            this.expired =
              Date.now() > new Date(lastJwtToken.claims.exp * 1000).valueOf();
          }
        },
        error: (err: { status: number }) => {
          if (err.status === 503) {
            // ignore
          } else {
            throw err;
          }
        },
      });

      if (this.hasSudo) {
        this.hourlyUsage = undefined;
        this.systemApi.getAccountUsage(this.account.id).subscribe({
          next: (
            data:
              | { success: number; unknown: number; failure: number }
              | undefined,
          ) => {
            this.hourlyUsage = data;
            if (this.lastJwtTokenData) {
              this.lastJwtTokenData.Usage = this.hourlyUsage;
            }
          },
          error: (err: { status: number }) => {
            if (err.status === 503) {
              // ignore
            } else {
              throw err;
            }
          },
        });
      }
    }
  }
}
