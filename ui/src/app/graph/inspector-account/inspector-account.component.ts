import {
  Component,
  Inject,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';

import { UserDto } from '../../service/graph.types';
import { CURRENT_USER } from '../../app-initialize.factory';
import { AccountGenerateDialogComponent } from '../account-generate-dialog/account-generate-dialog.component';
import { SystemApiService } from '../../service/system-api.service';
import { BrokerAccountRestDto } from '../../service/dto/broker-account-rest.dto';
import { JwtRegistryDto } from '../../service/dto/jwt-registry-rest.dto';
import { GraphApiService } from '../../service/graph-api.service';

@Component({
  selector: 'app-inspector-account',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTableModule],
  templateUrl: './inspector-account.component.html',
  styleUrls: ['./inspector-account.component.scss'],
})
export class InspectorAccountComponent implements OnChanges {
  @Input() account!: BrokerAccountRestDto;
  @Input() userIndex!: number | undefined;
  @Input() hasSudo = false;
  jwtTokens: JwtRegistryDto[] | undefined;
  lastJwtTokenData: any;
  expired = false;
  hourlyUsage: number | undefined;
  hourlyFails: number | undefined;
  propDisplayedColumns: string[] = ['key', 'value'];

  constructor(
    private readonly dialog: MatDialog,
    private readonly graphApi: GraphApiService,
    private readonly systemApi: SystemApiService,
    @Inject(CURRENT_USER) public readonly user: UserDto,
  ) {}

  updateAccount(): void {
    if (this.account && this.userIndex) {
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
    }

    if (this.hasSudo && this.account) {
      this.hourlyUsage = undefined;
      this.systemApi.getAccountUsage(this.account.id).subscribe(
        (data) => {
          this.hourlyUsage = data.success + data.unknown + data.failure;
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

  ngOnChanges(changes: SimpleChanges): void {
    this.jwtTokens = undefined;
    this.lastJwtTokenData = undefined;
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
        this.updateAccount();
      });
  }
}
