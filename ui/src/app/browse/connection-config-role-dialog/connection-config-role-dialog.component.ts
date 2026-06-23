import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { ConnectionConfigDto } from '../../service/persistence/dto/connection-config.dto';

export interface ConnectionConfigRoleDialogData {
  connectionConfig: ConnectionConfigDto;
}

@Component({
  selector: 'app-connection-config-role-dialog',
  imports: [MatDialogModule, MatButtonModule, CommonModule],
  templateUrl: './connection-config-role-dialog.component.html',
  styleUrl: './connection-config-role-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class ConnectionConfigRoleDialogComponent {
  readonly data = inject<ConnectionConfigRoleDialogData>(MAT_DIALOG_DATA);
}
