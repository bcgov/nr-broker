import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { ConnectionConfigDto } from '../../service/persistence/dto/connection-config.dto';
import { ExternalServiceCardComponent } from '../../shared/external-service-card/external-service-card.component';

export interface ConnectionConfigRoleDialogData {
  connectionConfig: ConnectionConfigDto;
}

@Component({
  selector: 'app-connection-config-role-dialog',
  imports: [MatDialogModule, MatButtonModule, ExternalServiceCardComponent],
  templateUrl: './connection-config-role-dialog.component.html',
  styleUrl: './connection-config-role-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class ConnectionConfigRoleDialogComponent {
  readonly data = inject<ConnectionConfigRoleDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ConnectionConfigRoleDialogComponent>);
  private readonly router = inject(Router);

  get canViewDetails(): boolean {
    return this.data.connectionConfig.collection === 'service' && !!this.data.connectionConfig.id;
  }

  goToDetails(): void {
    if (!this.canViewDetails) {
      return;
    }

    this.dialogRef.close();
    void this.router.navigate(['/home/external-service', this.data.connectionConfig.id]);
  }
}
