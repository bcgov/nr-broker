import { Component, EventEmitter, Input, Output, input, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import prettyMilliseconds from 'pretty-ms';

import { ServiceDto } from '../../service/persistence/dto/service.dto';
import { VaultDialogComponent } from '../vault-dialog/vault-dialog.component';
import { YesNoPipe } from '../../util/yes-no.pipe';
import { GraphApiService } from '../../service/graph-api.service';
import { PermissionService } from '../../service/permission.service';

@Component({
  selector: 'app-inspector-vault',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatListModule,
    MatTooltipModule,
    YesNoPipe,
  ],
  templateUrl: './inspector-vault.component.html',
  styleUrl: './inspector-vault.component.scss',
})
export class InspectorVaultComponent {
  private readonly permission = inject(PermissionService);
  private readonly graphApi = inject(GraphApiService);
  private readonly dialog = inject(MatDialog);

  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() service!: ServiceDto;
  readonly isAdministrator = input.required<boolean>();

  @Output() refreshData = new EventEmitter();

  totalDuration(val: any) {
    return prettyMilliseconds(val * 1000);
  }

  openVaultEditDialog() {
    this.dialog
      .open(VaultDialogComponent, {
        width: '500px',
        data: {
          service: this.service,
          showMasked: this.permission.hasAdmin(),
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
