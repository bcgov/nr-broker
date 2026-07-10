import { Component, computed, inject, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { TeamRoleEdgesComponent } from '../../browse/team-role-edges/team-role-edges.component';
import { ConnectionConfigDto } from '../../service/persistence/dto/connection-config.dto';
import { CollectionEdgeConfig, GitHubEdgeToRoles } from '../../service/persistence/dto/collection-config.dto';
import {
  BrokerChipClickEvent,
  BrokerRolesByEdge,
  ConnectionConfigChipInfo,
  ConnectionConfigChipsByRole,
  GitHubRolesByEdge,
} from '../../browse/team-roles/team-role-types';
import { ExternalServiceCardComponent } from '../external-service-card/external-service-card.component';
import { ScreenService } from '../../util/screen.service';

interface PermissionGroup {
  label: string;
  description: string;
  roles: string[];
}

@Component({
  selector: 'app-external-service-view',
  imports: [MatCardModule, ExternalServiceCardComponent, TeamRoleEdgesComponent],
  templateUrl: './external-service-view.component.html',
  styleUrl: './external-service-view.component.scss',
})
export class ExternalServiceViewComponent {
  readonly screen = inject(ScreenService);
  readonly connectionConfig = input<ConnectionConfigDto | null>(null);
  readonly edges = input<CollectionEdgeConfig[]>([]);
  readonly teamRoleChipsEnabled = input(false);
  readonly connectionConfigChipsForRole = input<ConnectionConfigChipsByRole>({});
  readonly gitHubRoleByEdge = input<GitHubRolesByEdge>({});
  readonly brokerRoleByEdge = input<BrokerRolesByEdge>({});
  readonly currentConnectionConfigId = input<string | null>(null);
  readonly permissionGroups = computed<PermissionGroup[]>(() => {
    const groups = new Map<string, PermissionGroup>();

    for (const mapping of this.connectionConfig()?.roleChipMappings ?? []) {
      const key = `${mapping.label}::${mapping.description ?? ''}`;

      if (!groups.has(key)) {
        groups.set(key, {
          label: mapping.label,
          description: mapping.description ?? '',
          roles: [],
        });
      }

      const group = groups.get(key);
      if (group && !group.roles.includes(mapping.role)) {
        group.roles.push(mapping.role);
      }
    }

    return [...groups.values()];
  });

  readonly connectionChipClick = output<ConnectionConfigChipInfo>();
  readonly githubChipClick = output<GitHubEdgeToRoles>();
  readonly brokerChipClick = output<BrokerChipClickEvent>();

  getEdgesForRoles(roles: string[]): CollectionEdgeConfig[] {
    const allowed = new Set(roles);
    return this.edges().filter((edge) => allowed.has(edge.name));
  }

  onConnectionChipClick(chip: ConnectionConfigChipInfo): void {
    this.connectionChipClick.emit(chip);
  }

  onGitHubChipClick(githubRole: GitHubEdgeToRoles): void {
    this.githubChipClick.emit(githubRole);
  }

  onBrokerChipClick(event: BrokerChipClickEvent): void {
    this.brokerChipClick.emit(event);
  }
}
