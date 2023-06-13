import { Component, Inject, Input, OnChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';

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
  imports: [CommonModule, MatButtonModule, MatTableModule],
  templateUrl: './inspector-account.component.html',
  styleUrls: ['./inspector-account.component.scss'],
})
export class InspectorAccountComponent implements OnChanges, OnInit {
  @Input() account!: BrokerAccountRestDto;
  @Input() userIndex!: number | undefined;
  jwtTokens: JwtRegistryDto[] | undefined;
  lastJwtTokenData: any;
  propDisplayedColumns: string[] = ['key', 'value'];
  isAdministrator = false;

  constructor(
    private dialog: MatDialog,
    private graphApi: GraphApiService,
    private systemApi: SystemApiService,
    @Inject(CURRENT_USER) public user: UserDto,
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
        }
      });

      this.graphApi
        .getUpstream(this.account.vertex, this.userIndex, ['administrator'])
        .subscribe((data) => {
          this.isAdministrator =
            data.filter((data) => {
              return data.collection.guid === this.user.guid;
            }).length > 0;
        });
    }
  }

  ngOnChanges(): void {
    this.jwtTokens = undefined;
    this.lastJwtTokenData = undefined;
    this.isAdministrator = false;
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
