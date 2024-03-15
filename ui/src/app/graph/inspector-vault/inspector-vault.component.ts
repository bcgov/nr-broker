import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { ServiceRestDto } from '../../service/dto/service-rest.dto';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { VaultDialogComponent } from '../vault-dialog/vault-dialog.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { YesNoPipe } from '../../util/yes-no.pipe';

@Component({
  selector: 'app-inspector-vault',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDividerModule,
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
  @Input() service!: ServiceRestDto;

  constructor(private readonly dialog: MatDialog) {}

  openVaultEditDialog() {
    this.dialog.open(VaultDialogComponent, {
      width: '500px',
      data: {
        service: this.service,
      },
    });
  }
}
