import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import {
  MatSnackBar,
  MatSnackBarModule,
  MatSnackBarConfig,
} from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClipboardModule } from '@angular/cdk/clipboard';

import { AccountGenerateDialogComponent } from '../account-generate-dialog/account-generate-dialog.component';
import { SystemApiService } from '../../service/system-api.service';
import { BrokerAccountDto } from '../../service/persistence/dto/broker-account.dto';
import { JwtRegistryDto } from '../../service/persistence/dto/jwt-registry.dto';
import { HealthStatusService } from '../../service/health-status.service';

@Component({
  selector: 'app-inspector-account',
  imports: [
    CommonModule,
    ClipboardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './inspector-account.component.html',
  styleUrls: ['./inspector-account.component.scss'],
})
export class InspectorAccountComponent implements OnChanges, OnInit, OnDestroy {
  @Input() account!: BrokerAccountDto;
  @Input() userIndex!: number | undefined;
  @Input() hasSudo = false;
  @Input() header: 'small' | 'large' = 'small';

  jwtTokens: JwtRegistryDto[] | undefined;
  lastJwtTokenData: any;
  expired = false;
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
    private readonly snackBar: MatSnackBar,
    private readonly systemApi: SystemApiService,
    public readonly healthStatus: HealthStatusService,
  ) {}

  ngOnInit(): void {
    this.tokenUpdateSubscription = this.systemApi
      .createAccountTokenEventSource()
      .subscribe({
        next: (data: any) => {
          if (data.clientId === this.account.clientId) {
            this.updateAccount();
          }
        },
        error: (error: any) => {
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
      .subscribe();
  }

  sync(): void {
    if (this.account && this.userIndex) {
      this.systemApi.brokerAccountRefresh(this.account.id).subscribe({
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

  private updateAccount(): void {
    if (this.account && this.userIndex) {
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

  private openSnackBar(message: string) {
    const config = new MatSnackBarConfig();
    config.duration = 5000;
    config.verticalPosition = 'bottom';
    this.snackBar.open(message, 'Dismiss', config);
  }
}
