import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { CollectionSyncService } from '../collection/collection-sync.service';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { CollectionSyncRequirement } from '../persistence/dto/sync-queue-config.dto';

interface SyncQueueHealthStatus {
  enabled: boolean;
  queue: string;
  requires?: CollectionSyncRequirement;
  unmetRequirements?: string[];
}

@Injectable()
export class SyncQueueHealthIndicator {
  constructor(
    private readonly collectionRepository: CollectionRepository,
    private readonly collectionSyncService: CollectionSyncService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    const queueConfigs = await this.collectionRepository.getSyncQueueConfigs();
    const queueHealthEntries = queueConfigs.map((queueConfig) => {
      const enabled = this.collectionSyncService.isSyncQueueEnabled(queueConfig);
      return [
        queueConfig.queue,
        {
          enabled,
          queue: queueConfig.queue,
          requires: queueConfig.requires,
          unmetRequirements: this.getUnmetRequirements(queueConfig.requires),
        } satisfies SyncQueueHealthStatus,
      ] as const;
    });

    const queues = Object.fromEntries(queueHealthEntries);

    return indicator.up({
      queues,
    });
  }

  private getUnmetRequirements(
    requirement?: CollectionSyncRequirement,
  ): string[] {
    if (!requirement) {
      return [];
    }

    const unmetRequirements: string[] = [];

    if (requirement.envAll && requirement.envAll.length > 0) {
      for (const envName of requirement.envAll) {
        const value = process.env[envName];
        if (typeof value !== 'string' || value.trim().length === 0) {
          unmetRequirements.push(`env:${envName}`);
        }
      }
    }

    if (requirement.health) {
      unmetRequirements.push(`unsupported:health:${requirement.health}`);
    }

    return unmetRequirements;
  }
}
