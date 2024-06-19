import { Component, Inject, Input, OnChanges, OnInit } from '@angular/core';
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
export class InspectorAccountComponent implements OnChanges, OnInit {
  @Input() account!: BrokerAccountRestDto;
  @Input() userIndex!: number | undefined;
  @Input() hasSudo = false;
  jwtTokens: JwtRegistryDto[] | undefined;
  lastJwtTokenData: any;
  expired = false;
  propDisplayedColumns: string[] = ['key', 'value'];

  constructor(
    private readonly dialog: MatDialog,
    private readonly graphApi: GraphApiService,
    private readonly systemApi: SystemApiService,
    @Inject(CURRENT_USER) public readonly user: UserDto,
  ) {}

  ngOnInit(): void {
    if (this.account && this.userIndex) {
      this.systemApi.getAccountTokens(this.account.id).subscribe((data) => {
        this.jwtTokens = data;
        const lastJwtToken = this.jwtTokens.pop();
        if (lastJwtToken) {
          this.lastJwtTokenData = {
            JTI: lastJwtToken.claims.jti,
            Expiry: new Date(lastJwtToken.claims.exp * 1000),
          };

          this.expired =
            Date.now() > new Date(lastJwtToken.claims.exp * 1000).valueOf();
        }
      });
    }
  }

  ngOnChanges(): void {
    this.jwtTokens = undefined;
    this.lastJwtTokenData = undefined;
    this.ngOnInit();
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
        this.ngOnInit();
      });
  }
}
