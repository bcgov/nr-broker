import { CommonModule } from '@angular/common';
import { Component, input, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

import { RepositoryDto } from '../../service/persistence/dto/repository.dto';
import { OpenShiftProjectDto } from '../../service/persistence/dto/openshift-project.dto';
import { CollectionApiService } from '../../service/collection-api.service';
import { HealthStatusService } from '../../service/health-status.service';
import { GithubRoleMappingDialogComponent } from '../github-role-mapping-dialog/github-role-mapping-dialog.component';
import { GithubSecretsDialogComponent } from '../github-secrets-dialog/github-secrets-dialog.component';
import { DetailsItemComponent } from '../../shared/details-item/details-item.component';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';
import { SyncStatusDto } from '../../service/persistence/dto/sync-status.dto';
import {
  CollectionConfigDto,
  CollectionSyncQueueRule,
} from '../../service/persistence/dto/collection-config.dto';

type SyncFlagKey = 'syncSecrets' | 'syncUsers';
type SyncEnabledKey = 'enableSyncSecrets' | 'enableSyncUsers';
type SyncStatusKey = 'syncSecretsStatus' | 'syncUsersStatus';
type SyncHelp = 'githubSecrets' | 'githubRoleMappings' | null;

interface SyncActionConfig {
  key: SyncFlagKey;
  label: string;
  enabledKey: SyncEnabledKey;
  statusKey: SyncStatusKey;
  successMessage: string;
  failureMessage: string;
  help: SyncHelp;
  requiresGithubEnabled: boolean;
}

const GITHUB_SYNC_HEALTH_PATH = ['github', 'sync'];

@Component({
  selector: 'app-inspector-repository-sync',
  imports: [
    CommonModule,
    MatButtonModule,
    MatTooltipModule,
    DetailsItemComponent,
  ],
  templateUrl: './inspector-repository-sync.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './inspector-repository-sync.component.scss',
})
export class InspectorRepositorySyncComponent {
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly collectionApi = inject(CollectionApiService);
  private readonly healthStatus = inject(HealthStatusService);

  readonly collection = input.required<CollectionNames>();
  readonly data = input.required<RepositoryDto | OpenShiftProjectDto>();
  readonly collectionConfig = input.required<CollectionConfigDto>();
  readonly hasSudo = input(false);
  readonly header = input<'small' | 'large'>('small');
  readonly syncActions = computed(() => {
    const rules = this.collectionConfig().syncQueues ?? [];
    return rules
      .filter((rule) => this.isDirectRule(rule))
      .map((rule) => this.toSyncActionConfig(rule))
      .filter((action): action is SyncActionConfig => action !== null);
  });

  readonly syncAvailable = computed(() => {
    const actions = this.syncActions();
    if (!actions.some((action) => action.requiresGithubEnabled)) {
      return true;
    }

    const details = this.healthStatus.healthSignal()?.['details'] as
      | Record<string, unknown>
      | undefined;
    if (!details) {
      return false;
    }

    let healthValue: unknown = details;
    for (const segment of GITHUB_SYNC_HEALTH_PATH) {
      healthValue = (healthValue as Record<string, unknown> | undefined)?.[
        segment
      ];
    }

    return healthValue === true;
  });

  sync(action: SyncActionConfig) {
    this.collectionApi
      .syncCollection(this.collection(), this.data().id, {
        syncSecrets: action.key === 'syncSecrets' ? true : undefined,
        syncUsers: action.key === 'syncUsers' ? true : undefined,
      })
      .subscribe({
        next: () => {
          this.openSnackBar(action.successMessage);
        },
        error: (err: any) => {
          this.openSnackBar(`${action.failureMessage}: ${err?.statusText ?? 'unknown'}`);
        },
      });
  }

  isEnabled(enabledKey: SyncEnabledKey) {
    return Boolean(this.data()[enabledKey]);
  }

  showQueued(statusKey: SyncStatusKey) {
    const status = this.data()[statusKey];
    return Boolean(status?.queuedAt && (!status?.syncAt || status?.queuedAt > status?.syncAt));
  }

  lastSyncAt(statusKey: SyncStatusKey): SyncStatusDto['syncAt'] {
    return this.data()[statusKey]?.syncAt;
  }

  openHelp(help: SyncHelp) {
    if (help === 'githubSecrets') {
      this.showGitHubSecrets();
      return;
    }
    if (help === 'githubRoleMappings') {
      this.showGitHubRoleMappings();
    }
  }

  showGitHubRoleMappings() {
    this.dialog
      .open(GithubRoleMappingDialogComponent, {
        width: '600px',
        data: {},
      })
      .afterClosed()
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .subscribe(() => {});
  }

  showGitHubSecrets() {
    this.dialog
      .open(GithubSecretsDialogComponent, {
        width: '600px',
        data: {},
      })
      .afterClosed()
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .subscribe(() => {});
  }

  private openSnackBar(message: string) {
    const config = new MatSnackBarConfig();
    config.duration = 5000;
    config.verticalPosition = 'bottom';
    this.snackBar.open(message, 'Dismiss', config);
  }

  private isDirectRule(rule: CollectionSyncQueueRule): boolean {
    return !rule.traversal && rule.targetCollection === this.collection();
  }

  private toSyncActionConfig(rule: CollectionSyncQueueRule): SyncActionConfig | null {
    const key = rule.queryOption;
    if (key !== 'syncSecrets' && key !== 'syncUsers') {
      return null;
    }

    const label = key === 'syncSecrets' ? 'Secrets' : 'User Access';
    const enabledKey = key === 'syncSecrets' ? 'enableSyncSecrets' : 'enableSyncUsers';
    const statusKey = key === 'syncSecrets' ? 'syncSecretsStatus' : 'syncUsersStatus';

    return {
      key,
      label,
      enabledKey,
      statusKey,
      successMessage: key === 'syncSecrets' ? 'Sync of secrets queued' : 'Sync of users queued',
      failureMessage: key === 'syncSecrets' ? 'Syncing secrets failed' : 'Syncing users failed',
      help: this.helpForQueue(rule.queue),
      requiresGithubEnabled: Boolean(rule.requiresGithubEnabled),
    };
  }

  private helpForQueue(queue: string): SyncHelp {
    if (queue === 'GITHUB_SYNC_SECRETS') {
      return 'githubSecrets';
    }
    if (queue === 'GITHUB_SYNC_USERS') {
      return 'githubRoleMappings';
    }
    return null;
  }
}
