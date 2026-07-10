import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { map } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';

import { CONFIG_RECORD } from '../../app-initialize.factory';
import { CollectionHeaderComponent } from '../../shared/collection-header/collection-header.component';
import { ExternalServiceViewComponent } from '../../shared/external-service-view/external-service-view.component';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { CollectionEdgeConfig, GitHubEdgeToRoles } from '../../service/persistence/dto/collection-config.dto';
import { SystemApiService } from '../../service/system-api.service';
import { FeatureFlagService } from '../../service/feature-flag.service';
import { ConnectionConfigDto } from '../../service/persistence/dto/connection-config.dto';
import { GraphApiService } from '../../service/graph-api.service';
import { CollectionApiService } from '../../service/collection-api.service';
import { GraphRolePermissionRuleDto } from '../../service/graph/dto/graph-role-permission-rule.dto';
import { EnvironmentDto } from '../../service/persistence/dto/environment.dto';
import {
  BrokerRolesByEdge,
  BrokerChipClickEvent,
  ConnectionConfigChipInfo,
  ConnectionConfigChipsByRole,
} from '../../browse/team-roles/team-role-types';
import {
  ConnectionConfigRoleDialogComponent,
  ConnectionConfigRoleDialogData,
} from '../../browse/connection-config-role-dialog/connection-config-role-dialog.component';
import {
  BrokerRoleMappingDialogComponent,
  BrokerRoleSudoCollection,
} from '../../browse/broker-role-mapping-dialog/broker-role-mapping-dialog.component';
import { PageErrorComponent } from '../../page-error/page-error.component';

@Component({
  selector: 'app-external-service',
  imports: [
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    CollectionHeaderComponent,
    ExternalServiceViewComponent,
    PageErrorComponent,
  ],
  templateUrl: './external-service.component.html',
  styleUrl: './external-service.component.scss',
})
export class ExternalServiceComponent {
  readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);
  private readonly systemApiService = inject(SystemApiService);
  private readonly graphApi = inject(GraphApiService);
  private readonly collectionApi = inject(CollectionApiService);
  private readonly featureFlagService = inject(FeatureFlagService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);

  private readonly serviceId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id'))),
    { initialValue: this.route.snapshot.paramMap.get('id') },
  );

  readonly connectionConfigResource = httpResource<ConnectionConfigDto[]>(() =>
    this.systemApiService.getConnectionConfigArgs(),
  );
  readonly loading = computed(() => this.connectionConfigResource.isLoading());
  readonly service = computed<ConnectionConfigDto | null>(() => {
    const services = (this.connectionConfigResource.value() ?? []).filter(
      (d) => d.collection === 'service',
    );
    return services.find((s) => s.id === this.serviceId()) ?? null;
  });
  private readonly connectionConfigs = computed(() => this.connectionConfigResource.value() ?? []);
  readonly teamRoleChipsEnabled = this.featureFlagService.isEnabled('teamRoleChips');
  readonly teamRolePermissionRulesResource = httpResource<GraphRolePermissionRuleDto[]>(() =>
    this.graphApi.getTeamRolePermissionRulesArgs(),
  );
  readonly environmentResource = httpResource<EnvironmentDto[]>(() =>
    this.collectionApi.exportCollectionArgs('environment'),
  );
  readonly edges = computed<CollectionEdgeConfig[]>(() => {
    const mappedRoles = new Set(
      (this.service()?.roleChipMappings ?? []).map((mapping) => mapping.role),
    );

    return this.configRecord['user'].edges.filter(
      (edge) => edge.collection === 'team' && mappedRoles.has(edge.name),
    );
  });
  readonly allServiceChipsByRole = computed<ConnectionConfigChipsByRole>(() => {
    const chipsByRole: ConnectionConfigChipsByRole = {};
    const services = (this.connectionConfigResource.value() ?? []).filter(
      (d) => d.collection === 'service',
    );

    for (const service of services) {
      for (const mapping of service.roleChipMappings ?? []) {
        if (!chipsByRole[mapping.role]) {
          chipsByRole[mapping.role] = [];
        }

        chipsByRole[mapping.role].push({
          label: mapping.label,
          description: mapping.description,
          connectionConfig: service,
        });
      }
    }

    return chipsByRole;
  });
  readonly gitHubRolesByEdge = computed<Record<string, GitHubEdgeToRoles>>(() => {
    const userConfig = this.configRecord['user'];
    const edgeToRoles: GitHubEdgeToRoles[] = userConfig?.edgeToRoles ?? [];
    const githubRolesByEdge: Record<string, GitHubEdgeToRoles> = {};

    for (const mapping of edgeToRoles) {
      for (const edgeName of mapping.edge ?? []) {
        githubRolesByEdge[edgeName] = mapping;
      }
    }

    return githubRolesByEdge;
  });
  private readonly rolePermissionRulesByRole = computed<Record<string, GraphRolePermissionRuleDto[]>>(() => {
    const rulesByRole: Record<string, GraphRolePermissionRuleDto[]> = {};

    for (const rule of this.teamRolePermissionRulesResource.value() ?? []) {
      if (!rulesByRole[rule.roleName]) {
        rulesByRole[rule.roleName] = [];
      }

      rulesByRole[rule.roleName].push(rule);
    }

    return rulesByRole;
  });
  private readonly environments = computed(() =>
    [...(this.environmentResource.value() ?? [])].sort((a, b) => a.position - b.position),
  );
  readonly brokerRolesByEdge = computed<BrokerRolesByEdge>(() => {
    const brokerRolesByEdge: BrokerRolesByEdge = {};
    const rolePermissionRulesByRole = this.rolePermissionRulesByRole();

    for (const edge of this.edges()) {
      const roleRules = rolePermissionRulesByRole[edge.name] ?? [];
      const allPermissions = roleRules.flatMap((rule) =>
        rule.steps.flatMap((step) => step.permissions),
      );
      const envChangeRole = this.getEnvironmentChangeRole(edge.name);
      const envTooltip = this.getEnvironmentChangeRoleTooltip(edge.name).trim();

      if (allPermissions.includes('sudo')) {
        brokerRolesByEdge[edge.name] = {
          label: 'Sudo',
          description: 'Click to view elevated permissions' + (envTooltip ? ', and can ' + envTooltip : ''),
          environmentChanges: envChangeRole ?? [],
        };
        continue;
      }

      if (allPermissions.includes('update')) {
        brokerRolesByEdge[edge.name] = {
          label: 'Update',
          description: 'Click to view update permissions' + (envTooltip ? ', and can ' + envTooltip : ''),
          environmentChanges: envChangeRole ?? [],
        };
        continue;
      }

      if (allPermissions.includes('approve')) {
        brokerRolesByEdge[edge.name] = {
          label: 'Approve',
          description: 'Click to view approval permissions' + (envTooltip ? ', and can ' + envTooltip : ''),
          environmentChanges: envChangeRole ?? [],
        };
        continue;
      }

      brokerRolesByEdge[edge.name] = envChangeRole
        ? {
            label: 'Change',
            description: 'Can ' + this.getEnvironmentChangeRoleTooltip(edge.name),
            environmentChanges: envChangeRole,
          }
        : null;
    }

    return brokerRolesByEdge;
  });

  getGitHubConnectionConfigChip(githubRole: GitHubEdgeToRoles): ConnectionConfigChipInfo | null {
    if (!githubRole) return null;

    for (const config of this.connectionConfigs()) {
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

  openBrokerRoleDialog(edge: CollectionEdgeConfig, chipLabel: string): void {
    const roleRules = this.rolePermissionRulesByRole()[edge.name] ?? [];
    const sudoCollectionsMap: Record<string, BrokerRoleSudoCollection> = {};
    const envChangeRole = this.getEnvironmentChangeRole(edge.name);

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

  handleBrokerChipClick(event: BrokerChipClickEvent): void {
    this.openBrokerRoleDialog(event.edge, event.chipLabel);
  }

  private getEnvironmentChangeRole(roleName: string): string[] | null {
    const environments = this.environments()
      .filter((environment) => environment.changeRoles?.includes(roleName))
      .map((environment) => environment.title || environment.name);

    if (environments.length === 0) {
      return null;
    }

    return environments;
  }

  private getEnvironmentChangeRoleTooltip(roleName: string): string {
    const info = this.getEnvironmentChangeRole(roleName);
    if (!info) {
      return '';
    }
    if (info.length === 1) {
      return `change the ${info[0].toLocaleLowerCase()} environment`;
    }

    if (info.length === this.environments().length) {
      return ' change all environments';
    }

    for (const env of this.environments()) {
      if (info.includes(env.title || env.name)) {
        return `change up to ${env.title?.toLocaleLowerCase() ?? env.name.toLocaleLowerCase()} environment`;
      }
    }

    return 'change some environments';
  }
}
