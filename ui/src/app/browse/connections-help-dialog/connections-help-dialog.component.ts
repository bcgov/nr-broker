import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { SystemApiService } from '../../service/system-api.service';
import { ConnectionConfigDto, RoleChipMappingDto } from '../../service/persistence/dto/connection-config.dto';

@Component({
  selector: 'app-connections-help-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatCardModule,
    MatIconModule,
    MatDividerModule,
    CommonModule,
  ],
  templateUrl: './connections-help-dialog.component.html',
  styleUrl: './connections-help-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class ConnectionsHelpDialogComponent implements OnInit {
  private readonly systemApi = inject(SystemApiService);

  readonly connectionConfigResource = httpResource<ConnectionConfigDto[]>(() =>
    this.systemApi.getConnectionConfigArgs(),
  );

  readonly loading = computed(() => this.connectionConfigResource.isLoading());
  readonly connectionConfigs = computed<ConnectionConfigDto[]>(() => {
    const configs = this.connectionConfigResource.value() ?? [];
    return configs.sort((a, b) => a.order - b.order);
  });

  ngOnInit(): void {
    this.connectionConfigResource.set({});
    this.connectionConfigResource.load();
  }

  getServiceIcon(config: ConnectionConfigDto): string {
    return config.imageEmbedded || config.imageUrl || 'assets/broker-bw.svg';
  }

  hasRoleMappings(config: ConnectionConfigDto): boolean {
    return config.roleChipMappings && config.roleChipMappings.length > 0;
  }

  getRoleMappings(config: ConnectionConfigDto): RoleChipMappingDto[] {
    return config.roleChipMappings ?? [];
  }
}
