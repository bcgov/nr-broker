import { CommonModule } from '@angular/common';
import { Component, input, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import dlv from 'dlv';

import { CollectionApiService } from '../../service/collection-api.service';
import { HealthStatusService } from '../../service/health-status.service';
import { SYNC_QUEUE_CONFIG_RECORD } from '../../app-initialize.factory';
import { DetailsItemComponent } from '../../shared/details-item/details-item.component';
import { CollectionNames, CollectionValues } from '../../service/persistence/dto/collection-dto-union.type';
import { SyncStatusDto } from '../../service/persistence/dto/sync-status.dto';
import { CollectionConfigDto } from '../../service/persistence/dto/collection-config.dto';
import { CollectionSyncQueueRuleDto } from '../../service/persistence/dto/collection-sync-queue-rule.dto';
import {
  CollectionSyncRequirement,
} from '../../service/persistence/dto/sync-queue-config.dto';
import {
  SyncQueueHelpDialogComponent,
} from '../sync-queue-help-dialog/sync-queue-help-dialog.component';

interface ResolvedSyncQueueAction {
  queue: string;
  label: string;
  summary: string;
  requiredEnabledProperty?: string;
  queuedStatusProperty?: string;
  requires?: CollectionSyncRequirement;
}

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
  private readonly syncQueueConfigRecord = inject(SYNC_QUEUE_CONFIG_RECORD);

  readonly collection = input.required<CollectionNames>();
  readonly data = input.required<CollectionValues>();
  readonly collectionConfig = input.required<CollectionConfigDto>();
  readonly hasSudo = input(false);
  readonly hasAdmin = input(false);
  readonly header = input<'small' | 'large'>('small');
  readonly syncActions = computed(() => {
    const rules = this.collectionConfig().syncQueues ?? [];
    return rules
      .flatMap((rule) => this.toSyncActions(rule))
      .filter((action): action is ResolvedSyncQueueAction => action !== null);
  });

  readonly hasSyncQueues = computed(() => {
    const rules = this.collectionConfig().syncQueues ?? [];
    return rules.length > 0;
  });

  readonly syncAvailable = computed(() => {
    const requirements = this.syncActions()
      .map((action) => action.requires)
      .filter((requirement): requirement is CollectionSyncRequirement =>
        Boolean(requirement),
      );

    if (requirements.length === 0) {
      return true;
    }

    const health = this.healthStatus.healthSignal() as
      | Record<string, unknown>
      | null
      | undefined;
    if (!health) {
      return false;
    }

    return requirements.every((requirement) =>
      this.matchesRequirement(health, requirement),
    );
  });

  sync(action: ResolvedSyncQueueAction, dryRun = false) {
    if (dryRun) {
      return this.callSync(action, true, {
        next: (result) => {
          if (Array.isArray(result)) {
            const count = result.length;
            this.openSnackBar(
              `${action.label} dry run completed (${count} target${count === 1 ? '' : 's'})`,
            );
          }
        },
      });
    }

    return this.callSync(action, true, {
      next: (precheck) => {
        if (Array.isArray(precheck) && precheck.length === 0) {
          this.openSnackBar(`${action.label} sync skipped: no targets found`);
          return;
        }

        this.callSync(action, false, 'sync queued');
      },
    });
  }

  private callSync(
    action: ResolvedSyncQueueAction,
    dryRun: boolean,
    handler: { next?: (result: unknown) => void; error?: (err: any) => void } | string,
  ): void {
    this.collectionApi
      .syncCollection(this.collection(), this.data().id, {
        queue: action.queue,
        dryRun,
      })
      .subscribe({
        next: (result) => {
          if (typeof handler === 'string') {
            this.openSnackBar(`${action.label} ${handler}`);
          } else {
            handler.next?.(result);
          }
        },
        error: (err: any) => {
          if (typeof handler === 'string') {
            this.openSnackBar(`${action.label} sync failed: ${err?.statusText ?? 'unknown'}`);
          } else {
            handler.error?.(err);
          }
        },
      });
  }

  isEnabled(requiredEnabledProperty?: string) {
    if (!requiredEnabledProperty) {
      return true;
    }

    return this.getDataValue(requiredEnabledProperty) === true;
  }

  showQueued(statusKey?: string) {
    const status = this.getSyncStatus(statusKey);
    return Boolean(status?.queuedAt && (!status?.syncAt || status?.queuedAt > status?.syncAt));
  }

  lastSyncAt(statusKey?: string): SyncStatusDto['syncAt'] {
    return this.getSyncStatus(statusKey)?.syncAt;
  }

  queuedAt(statusKey?: string): SyncStatusDto['queuedAt'] {
    return this.getSyncStatus(statusKey)?.queuedAt;
  }

  private openSnackBar(message: string) {
    const config = new MatSnackBarConfig();
    config.duration = 5000;
    config.verticalPosition = 'bottom';
    this.snackBar.open(message, 'Dismiss', config);
  }

  private toSyncActions(rule: CollectionSyncQueueRuleDto): (ResolvedSyncQueueAction | null)[] {
    const actions: (ResolvedSyncQueueAction | null)[] = [];

    // Handle direct queue rule
    if (rule.queue?.queue) {
      const queueConfig = rule.queue;
      const queueName = queueConfig.queue;
      const label = this.syncQueueConfigRecord[queueName]?.label || queueName;

      actions.push({
        queue: queueName,
        label,
        summary: this.queueSummary(queueName),
        requiredEnabledProperty: queueConfig.requiredEnabledProperty,
        queuedStatusProperty: queueConfig.queuedStatusProperty,
        requires: this.syncQueueConfigRecord[queueName]?.requires,
      });
    }

    // Handle indirect traverse rule
    if (rule.traverse?.queues && rule.traverse.queues.length > 0) {
      const traverseQueues = rule.traverse.queues;

      traverseQueues.forEach((queueName) => {
        const label = this.syncQueueConfigRecord[queueName]?.label || queueName;

        actions.push({
          queue: queueName,
          label,
          summary: this.queueSummary(queueName),
          requires: this.syncQueueConfigRecord[queueName]?.requires,
        });
      });
    }

    return actions;
  }

  queueSummary(queue: string): string {
    return this.syncQueueConfigRecord[queue]?.summary ?? '';
  }

  queueDescriptionLines(queue: string): string[] {
    return this.syncQueueConfigRecord[queue]?.description ?? [];
  }

  openQueueHelp(action: ResolvedSyncQueueAction): void {
    this.dialog.open(SyncQueueHelpDialogComponent, {
      width: '600px',
      data: {
        name: action.queue,
        label: action.label,
        summary: action.summary,
        description:
          this.queueDescriptionLines(action.queue).length > 0
            ? this.queueDescriptionLines(action.queue)
            : ['No description is configured for this queue.'],
      },
    });
  }

  private matchesRequirement(
    health: Record<string, unknown>,
    requirement: CollectionSyncRequirement,
  ): boolean {
    const actualValue = dlv(health, requirement.health);
    if (actualValue === undefined) {
      return false;
    }

    if (typeof requirement.value === 'boolean') {
      return actualValue === requirement.value;
    }

    return String(actualValue) === requirement.value;
  }

  private getDataValue(property: string): unknown {
    return (this.data() as unknown as Record<string, unknown>)[property];
  }

  private getSyncStatus(property?: string): SyncStatusDto | undefined {
    if (!property) {
      return undefined;
    }

    const value = this.getDataValue(property);
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return value as SyncStatusDto;
  }
}
