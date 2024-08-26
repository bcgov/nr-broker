import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AccountGenerateDialogComponent } from '../account-generate-dialog/account-generate-dialog.component';
import { SystemApiService } from '../../service/system-api.service';
import { BrokerAccountRestDto } from '../../service/dto/broker-account-rest.dto';
import { JwtRegistryDto } from '../../service/dto/jwt-registry-rest.dto';

@Component({
  selector: 'app-inspector-account',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './inspector-account.component.html',
  styleUrls: ['./inspector-account.component.scss'],
})
export class InspectorAccountComponent implements OnChanges, OnInit {
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

  constructor(
    private readonly dialog: MatDialog,
    private readonly systemApi: SystemApiService,
  ) {}

  ngOnInit(): void {
    this.updateAccount();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['account']) {
      this.updateAccount();
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
        this.systemApi.refresh(this.account.id);
        this.requestedAccountId = undefined;
        this.updateAccount();
      });
  }

  private updateAccount(): void {
    if (this.account && this.userIndex) {
      if (this.account.id === this.requestedAccountId) {
        return;
      }
      this.requestedAccountId = this.account.id;
      this.jwtTokens = undefined;
      this.lastJwtTokenData = undefined;
      this.systemApi.getAccountTokens(this.account.id).subscribe((data) => {
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
      });

      if (this.hasSudo) {
        this.hourlyUsage = undefined;
        this.systemApi.getAccountUsage(this.account.id).subscribe(
          (data) => {
            this.hourlyUsage = data;
            if (this.lastJwtTokenData) {
              this.lastJwtTokenData.Usage = this.hourlyUsage;
            }
          },
          (err) => {
            if (err.status === 503) {
              // ignore
            } else {
              throw err;
            }
          },
        );
      }
    }
  }
}
