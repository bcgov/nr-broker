import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import prettyMilliseconds from 'pretty-ms';

import { ServiceRestDto } from '../../service/dto/service-rest.dto';
import { VaultDialogComponent } from '../vault-dialog/vault-dialog.component';
import { YesNoPipe } from '../../util/yes-no.pipe';
import { UserDto } from '../../service/graph.types';
import { CURRENT_USER } from '../../app-initialize.factory';
import { GraphApiService } from '../../service/graph-api.service';
import { DurationPipe } from '../../util/duration.pipe';

@Component({
  selector: 'app-inspector-vault',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatListModule,
    MatTooltipModule,
    YesNoPipe,
    DurationPipe,
  ],
  templateUrl: './inspector-vault.component.html',
  styleUrl: './inspector-vault.component.scss',
})
export class InspectorVaultComponent {
  @Input() service!: ServiceRestDto;
  @Input() isAdministrator!: boolean;

  @Output() refreshData = new EventEmitter();

  constructor(
    @Inject(CURRENT_USER) private readonly user: UserDto,
    private readonly graphApi: GraphApiService,
    private readonly dialog: MatDialog,
  ) {}

  totalDuration(val: any) {
    return prettyMilliseconds(val * 1000);
  }

  openVaultEditDialog() {
    this.dialog
      .open(VaultDialogComponent, {
        width: '500px',
        data: {
          service: this.service,
          showMasked: this.user.roles.includes('admin'),
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result && result.save) {
          const data: any = {
            ...this.service,
          };
          delete data.id;
          delete data.vertex;
          data.vaultConfig = result.vaultConfig;
          console.log(data);
          this.graphApi
            .editVertex(
              this.service.vertex,
              {
                collection: 'service',
                data,
              },
              true,
            )
            .subscribe(() => {
              this.refreshData.emit();
            });
        }
      });
  }
}
