import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { CollectionEdgeConfig, GitHubEdgeToRoles } from '../../service/persistence/dto/collection-config.dto';
import { EdgetitlePipe } from '../../util/edgetitle.pipe';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { GraphApiService } from '../../service/graph-api.service';
import { CollectionApiService } from '../../service/collection-api.service';
import { GraphRolePermissionRuleDto } from '../../service/graph/dto/graph-role-permission-rule.dto';
import { EnvironmentDto } from '../../service/persistence/dto/environment.dto';
import {
  BrokerRoleMappingDialogComponent,
  BrokerRoleSudoCollection,
} from './broker-role-mapping-dialog.component';

interface GitHubRoleInfo {
  role: string;
  label: string;
  description: string;
  url: string;
}

interface BrokerRoleInfo {
  label: 'sudo' | 'update' | 'approve';
}

interface EnvironmentChangeRoleInfo {
  label: string;
  environments: string[];
}

interface BrokerChipInfo {
  label: 'sudo' | 'update' | 'approve' | 'Change';
  environmentChanges: string[];
}

const GITHUB_ROLE_MAP: Record<string, GitHubRoleInfo> = {
  admin: {
    role: 'admin',
    label: 'Admin',
    description: 'Recommended for people who need full access to the project, including sensitive and destructive actions like managing security or deleting a repository.',
    url: 'https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization',
  },
  maintain: {
    role: 'maintain',
    label: 'Maintain',
    description: 'Recommended for project managers who need to manage the repository without access to sensitive or destructive actions.',
    url: 'https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization',
  },
  write: {
    role: 'write',
    label: 'Write',
    description: 'Recommended for contributors who need to write access to the repository, including pushing code, creating branches, and opening issues and pull requests.',
    url: 'https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization',
  },
  triage: {
    role: 'triage',
    label: 'Triage',
    description: 'Recommended for contributors who need to proactively manage issues, discussions, and pull requests without write access',
    url: 'https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization',
  },
  read: {
    role: 'read',
    label: 'Read',
    description: 'Recommended for people who only need read access to the repository, such as stakeholders or observers.',
    url: 'https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization',
  },
};

@Component({
  selector: 'app-team-roles',
  imports: [MatChipsModule, MatDividerModule, MatTooltipModule, MatRippleModule, EdgetitlePipe],
  templateUrl: './team-roles.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './team-roles.component.scss',
})
export class TeamRolesComponent {
  readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);
  private readonly graphApi = inject(GraphApiService);
  private readonly collectionApi = inject(CollectionApiService);
  private readonly dialog = inject(MatDialog);

  edges: CollectionEdgeConfig[] = this.configRecord['user'].edges.filter(
    (edge) => edge.collection === 'team',
  );

  private readonly rolePermissionRulesByRole: Record<string, GraphRolePermissionRuleDto[]> = {};
  private environments: EnvironmentDto[] = [];

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
  }

  getGitHubRole(edge: CollectionEdgeConfig): GitHubRoleInfo | null {
    const userConfig = this.configRecord['user'];
    const edgeToRoles: GitHubEdgeToRoles[] = userConfig?.edgeToRoles ?? [];

    for (const mapping of edgeToRoles) {
      if (mapping.edge?.includes(edge.name)) {
        const roleInfo = GITHUB_ROLE_MAP[mapping.role];
        return roleInfo ?? null;
      }
    }

    return null;
  }

  getEnvironmentChangeRole(edge: CollectionEdgeConfig): EnvironmentChangeRoleInfo | null {
    const environments = this.environments
      .filter((environment) => environment.changeRoles?.includes(edge.name))
      .map((environment) => environment.title || environment.name);

    if (environments.length === 0) {
      return null;
    }

    return {
      label: 'Change',
      environments,
    };
  }

  getEnvironmentChangeRoleTooltip(edge: CollectionEdgeConfig): string {
    const info = this.getEnvironmentChangeRole(edge);
    if (!info) {
      return '';
    }
    return `Change role environments: ${info.environments.join(', ')}`;
  }

  getBrokerChipInfo(edge: CollectionEdgeConfig): BrokerChipInfo | null {
    const brokerRole = this.getBrokerRole(edge);
    const envChangeRole = this.getEnvironmentChangeRole(edge);
    if (!brokerRole && !envChangeRole) {
      return null;
    }

    return {
      label: brokerRole?.label ?? 'Change',
      environmentChanges: envChangeRole?.environments ?? [],
    };
  }

  getBrokerRole(edge: CollectionEdgeConfig): BrokerRoleInfo | null {
    const roleRules = this.rolePermissionRulesByRole[edge.name] ?? [];
    const allPermissions = roleRules.flatMap((rule) =>
      rule.steps.flatMap((step) => step.permissions),
    );

    if (allPermissions.includes('sudo')) {
      return { label: 'sudo' };
    }
    if (allPermissions.includes('update')) {
      return { label: 'update' };
    }
    if (allPermissions.includes('approve')) {
      return { label: 'approve' };
    }

    return null;
  }

  openBrokerRoleDialog(edge: CollectionEdgeConfig, chipLabel: 'sudo' | 'update' | 'approve' | 'Change') {
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
        roleName: edge.name,
        chipLabel,
        rules: roleRules,
        sudoCollections: Object.values(sudoCollectionsMap),
        changeEnvironments: envChangeRole?.environments ?? [],
      },
    });
  }
}
