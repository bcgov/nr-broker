import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { CollectionEdgeConfig, GitHubEdgeToRoles } from '../../service/persistence/dto/collection-config.dto';
import { EdgetitlePipe } from '../../util/edgetitle.pipe';
import { MatDialog } from '@angular/material/dialog';
import { GraphApiService } from '../../service/graph-api.service';
import { CollectionApiService } from '../../service/collection-api.service';
import { SystemApiService } from '../../service/system-api.service';
import { GraphRolePermissionRuleDto } from '../../service/graph/dto/graph-role-permission-rule.dto';
import { EnvironmentDto } from '../../service/persistence/dto/environment.dto';
import { ConnectionConfigDto } from '../../service/persistence/dto/connection-config.dto';
import {
  BrokerRoleMappingDialogComponent,
  BrokerRoleSudoCollection,
} from '../broker-role-mapping-dialog/broker-role-mapping-dialog.component';
import {
  ConnectionConfigRoleDialogComponent,
  ConnectionConfigRoleDialogData,
} from '../connection-config-role-dialog/connection-config-role-dialog.component';
import { TeamRoleChipComponment } from '../team-role-chip/team-role-chip.component';

interface BrokerChipInfo {
  label: string;
  environmentChanges: string[];
  description?: string;
}

interface ConnectionConfigChipInfo {
  label: string;
  description: string;
  connectionConfig: ConnectionConfigDto;
}

@Component({
  selector: 'app-team-roles',
  imports: [MatChipsModule, MatDividerModule, EdgetitlePipe, TeamRoleChipComponment],
  templateUrl: './team-roles.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './team-roles.component.scss',
})
export class TeamRolesComponent {
  readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);
  private readonly graphApi = inject(GraphApiService);
  private readonly collectionApi = inject(CollectionApiService);
  private readonly systemApi = inject(SystemApiService);
  private readonly dialog = inject(MatDialog);

  edges: CollectionEdgeConfig[] = this.configRecord['user'].edges.filter(
    (edge) => edge.collection === 'team',
  );

  private readonly rolePermissionRulesByRole: Record<string, GraphRolePermissionRuleDto[]> = {};
  private environments: EnvironmentDto[] = [];
  private connectionConfigs: ConnectionConfigDto[] = [];

  constructor() {
    this.graphApi.getTeamRolePermissionRules().subscribe((rules) => {
      for (const rule of rules) {
        if (!this.rolePermissionRulesByRole[rule.roleName]) {
          this.rolePermissionRulesByRole[rule.roleName] = [];
        }
        this.rolePermissionRulesByRole[rule.roleName].push(rule);
      }
    });

    this.collectionApi.exportCollection('environment').subscribe((environments) => {
      this.environments = [...environments].sort((a, b) => a.position - b.position);
    });

    this.systemApi.getConnectionConfig().subscribe((configs) => {
      this.connectionConfigs = configs;
    });
  }

  getGitHubRole(edge: CollectionEdgeConfig): GitHubEdgeToRoles | null {
    const userConfig = this.configRecord['user'];
    const edgeToRoles: GitHubEdgeToRoles[] = userConfig?.edgeToRoles ?? [];

    for (const mapping of edgeToRoles) {
      if (mapping.edge?.includes(edge.name)) {
        return mapping ?? null;
      }
    }

    return null;
  }

  getConnectionConfigChipsForRole(roleName: string): ConnectionConfigChipInfo[] {
    const chips: ConnectionConfigChipInfo[] = [];

    for (const config of this.connectionConfigs) {
      for (const mapping of config.roleChipMappings ?? []) {
        if (mapping.role === roleName) {
          chips.push({
            label: mapping.label,
            description: mapping.description,
            connectionConfig: config,
          });
        }
      }
    }

    return chips;
  }

  getGitHubConnectionConfigChip(githubRole: GitHubEdgeToRoles): ConnectionConfigChipInfo | null {
    if (!githubRole) return null;

    // Find the connection config that has a roleChipMapping for this GitHub role
    for (const config of this.connectionConfigs) {
      for (const mapping of config.roleChipMappings ?? []) {
        if (mapping.role === githubRole.role) {
          return {
            label: githubRole.label,
            description: githubRole.description,
            connectionConfig: config,
          };
        }
      }
    }

    // If no matching connection config found, create one from the GitHub role info
    return {
      label: 'GitHub',
      description: githubRole.description,
      connectionConfig: {
        id: githubRole.role,
        collection: 'github',
        description: 'GitHub is a code hosting platform for version control and collaboration. Broker syncs team roles to GitHub and can sync secrets from Vault.',
        href: 'https://github.com',
        documentationUrl: githubRole.url,
        imageUrl: 'assets/github.svg',
        name: 'GitHub',
        order: 0,
        roleChipMappings: [{ role: githubRole.role, label: githubRole.label, description: githubRole.description }],
      },
    };
  }

  getBrokerRole(edge: CollectionEdgeConfig): BrokerChipInfo | null {
    const roleRules = this.rolePermissionRulesByRole[edge.name] ?? [];
    const allPermissions = roleRules.flatMap((rule) =>
      rule.steps.flatMap((step) => step.permissions),
    );
    const envChangeRole = this.getEnvironmentChangeRole(edge);
    const envTooltip = this.getEnvironmentChangeRoleTooltip(edge).trim();

    if (allPermissions.includes('sudo')) {
      return {
        label: 'Sudo',
        description: 'Click to view elevated permissions' + (envTooltip ? ', and can ' + envTooltip : ''),
        environmentChanges: envChangeRole ?? [],
      };
    }
    if (allPermissions.includes('update')) {
      return {
        label: 'Update',
        description: 'Click to view update permissions' + (envTooltip ? ', and can ' + envTooltip : ''),
        environmentChanges: envChangeRole ?? [],
      };
    }
    if (allPermissions.includes('approve')) {
      return {
        label: 'Approve',
        description: 'Click to view approval permissions' + (envTooltip ? ', and can ' + envTooltip : ''),
        environmentChanges: envChangeRole ?? [],
      };
    }

    if (!envChangeRole) {
      return null;
    }

    return {
      label: 'Change',
      description: 'Can ' + this.getEnvironmentChangeRoleTooltip(edge),
      environmentChanges: envChangeRole ?? [],
    };
  }

  openBrokerRoleDialog(edge: CollectionEdgeConfig, chipLabel: string): void {
    const roleRules = this.rolePermissionRulesByRole[edge.name] ?? [];
    const sudoCollectionsMap: Record<string, BrokerRoleSudoCollection> = {};
    const envChangeRole = this.getEnvironmentChangeRole(edge);

    for (const rule of roleRules) {
      for (const step of rule.steps) {
        if (step.permissions.includes('sudo')) {
          const collectionConfig = this.configRecord[step.vertexCollection];
          sudoCollectionsMap[step.vertexCollection] = {
            collection: step.vertexCollection,
            title: collectionConfig?.name ?? step.vertexCollection,
            sudoHelp: collectionConfig?.sudoHelp,
          };
        }
      }
    }

    this.dialog.open(BrokerRoleMappingDialogComponent, {
      width: '780px',
      maxWidth: '95vw',
      data: {
        edge,
        roleName: edge.name,
        chipLabel,
        rules: roleRules,
        sudoCollections: Object.values(sudoCollectionsMap),
        changeEnvironments: envChangeRole ?? [],
      },
    });
  }

  openConnectionConfigDialog(chipInfo: ConnectionConfigChipInfo | null): void {
    if (!chipInfo) {
      return;
    }

    const data: ConnectionConfigRoleDialogData = {
      connectionConfig: chipInfo.connectionConfig,
    };

    this.dialog.open(ConnectionConfigRoleDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      data,
    });
  }

  getConnectionChipIcon(connectionConfig: ConnectionConfigDto): string {
    return connectionConfig.imageEmbedded || connectionConfig.imageUrl || 'assets/broker-bw.svg';
  }

  private getEnvironmentChangeRole(edge: CollectionEdgeConfig): string[] | null {
    const environments = this.environments
      .filter((environment) => environment.changeRoles?.includes(edge.name))
      .map((environment) => environment.title || environment.name);

    if (environments.length === 0) {
      return null;
    }

    return environments;
  }

  private getEnvironmentChangeRoleTooltip(edge: CollectionEdgeConfig): string {
    const info = this.getEnvironmentChangeRole(edge);
    if (!info) {
      return '';
    }
    if (info.length === 1) {
      return `change the ${info[0].toLocaleLowerCase()} environment`;
    }

    if (info.length === this.environments.length) {
      return ' change all environments';
    }

    // Find the environment with the highest priority (lowest position number)
    for (const env of this.environments) {
      if (info.includes(env.title || env.name)) {
        return `change up to ${env.title?.toLocaleLowerCase() ?? env.name.toLocaleLowerCase()} environment`;
      }
    }

    return 'change some environments';
  }
}
