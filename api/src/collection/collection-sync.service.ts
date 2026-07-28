import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CollectionNames } from '../persistence/dto/collection-dto-union.type';
import { REDIS_QUEUES } from '../constants';
import { CollectionNameEnum } from '../persistence/entity/collection-entity-union.type';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { RedisService } from '../redis/redis.service';
import { GraphService } from '../graph/graph.service';
import { CollectionValues } from '../persistence/entity/collection-entity-union.type';
import {
  CollectionSyncQueueRuleDto,
  CollectionSyncTraversalRule,
} from '../persistence/dto/collection-sync-queue-rule.dto';
import {
  SyncQueueConfigDto,
  SyncType,
  CollectionSyncRequirement,
} from '../persistence/dto/sync-queue-config.dto';
import { VertexPointerDto } from 'src/persistence/dto/vertex-pointer.dto';

type QueueRuleConfig = NonNullable<CollectionSyncQueueRuleDto['queue']>;

interface QueueTargetTask {
  queueRule: QueueRuleConfig;
  target: CollectionValues;
}

@Injectable()
export class CollectionSyncService {
  constructor(
    private readonly collectionRepository: CollectionRepository,
    private readonly graphRepository: GraphRepository,
    private readonly redisService: RedisService,
    private readonly graphService: GraphService,
  ) {}

  async getSyncQueuesByType(
    syncType: SyncType,
  ): Promise<SyncQueueConfigDto[]> {
    return this.collectionRepository.getSyncQueueConfigsBySyncType(syncType);
  }

  async getSyncQueuesByTypeForCollection(
    collection: CollectionNames,
    syncType: SyncType,
  ): Promise<SyncQueueConfigDto[]> {
    const collectionConfig = await this.collectionRepository
      .getCollectionConfigByName(collection)
      .catch(() => null);
    const rules = collectionConfig?.syncQueues ?? [];
    const allowedQueues = new Set(this.collectQueueNamesFromRules(rules));

    if (allowedQueues.size === 0) {
      return [];
    }

    const queueConfigs =
      await this.collectionRepository.getSyncQueueConfigsBySyncType(syncType);
    return queueConfigs.filter((queueConfig) =>
      allowedQueues.has(queueConfig.queue),
    );
  }

  async isSyncTypeEnabled(syncType: SyncType): Promise<boolean> {
    const matchingQueueConfigs = await this.getSyncQueuesByType(syncType);

    return matchingQueueConfigs.some((queueConfig) =>
      this.isSyncQueueEnabled(queueConfig),
    );
  }

  async isSyncTypeEnabledForCollection(
    collection: CollectionNames,
    syncType: SyncType,
  ): Promise<boolean> {
    const matchingQueueConfigs = await this.getSyncQueuesByTypeForCollection(
      collection,
      syncType,
    );

    return matchingQueueConfigs.some((queueConfig) =>
      this.isSyncQueueEnabled(queueConfig),
    );
  }

  async refreshByType(
    collection: CollectionNames,
    id: string,
    syncType: SyncType,
    dryRun = false,
  ): Promise<CollectionValues[] | void> {
    const queueConfigs = await this.getSyncQueuesByTypeForCollection(
      collection,
      syncType,
    );
    if (queueConfigs.length === 0) {
      throw new NotFoundException(
        `Sync queue config is not defined for type ${syncType} in collection ${collection}`,
      );
    }

    if (!dryRun) {
      for (const queueConfig of queueConfigs) {
        await this.refresh(collection, id, queueConfig.queue, false);
      }
      return;
    }

    const dryRunTargets: CollectionValues[] = [];
    for (const queueConfig of queueConfigs) {
      const targets = await this.refresh(collection, id, queueConfig.queue, true);
      if (targets) {
        dryRunTargets.push(...targets);
      }
    }

    return this.dedupeTargets(dryRunTargets);
  }

  private collectQueueNamesFromRules(
    rules: CollectionSyncQueueRuleDto[],
  ): string[] {
    const queueNames = new Set<string>();

    for (const rule of rules) {
      if (rule.queue?.queue) {
        queueNames.add(rule.queue.queue);
      }
      if (rule.traverse?.queues) {
        for (const queueName of rule.traverse.queues) {
          queueNames.add(queueName);
        }
      }
    }

    return Array.from(queueNames);
  }

  isSyncQueueEnabled(queueConfig?: SyncQueueConfigDto | null): boolean {
    if (!queueConfig) {
      return false;
    }
    return this.getRequirementStatus(queueConfig.requires).met;
  }

  async refresh(
    collection: CollectionNames,
    id: string,
    queueName: string,
    dryRun = false,
  ): Promise<CollectionValues[] | void> {
    const collectionConfig = await this.collectionRepository
      .getCollectionConfigByName(collection)
      .catch(() => null);
    const rules = collectionConfig?.syncQueues ?? [];

    const queueConfig = await this.collectionRepository.getSyncQueueConfigByQueue(
      queueName,
    );
    if (!queueConfig) {
      throw new NotFoundException(
        `Sync queue config is not defined for queue ${queueName}`,
      );
    }
    if (!this.isSyncQueueEnabled(queueConfig)) {
      throw new ServiceUnavailableException(
        `Sync queue ${queueName} is not available due to unmet requirement: ${JSON.stringify(
          queueConfig.requires,
        )}`,
      );
    }

    const rootRule = this.findRuleByQueue(rules, queueName, collection);
    // console.log(rootRule);
    const tasks = await this.resolveQueueTargets(
      collection,
      id,
      rootRule,
      queueName,
      new Set(),
    );
    // console.log(tasks);

    const dryRunTargets: CollectionValues[] = [];

    for (const task of tasks) {
      if (
        !this.isQueueTargetEnabled(
          task.target as unknown as Record<string, unknown>,
          task.queueRule.requiredEnabledProperty,
        )
      ) {
        continue;
      }

      // console.log(task);

      if (dryRun) {
        dryRunTargets.push(task.target);
        continue;
      }

      await this.queueTarget(task.queueRule, task.target);
    }

    if (dryRun) {
      return this.dedupeTargets(dryRunTargets);
    }
  }

  private async resolveQueueTargets(
    sourceCollection: CollectionNames,
    sourceId: string,
    scopedRule: CollectionSyncQueueRuleDto,
    allowedQueue: string,
    seen: Set<string>,
  ): Promise<QueueTargetTask[]> {
    const visitKey = `${sourceCollection}:${sourceId}:${allowedQueue}`;
    if (seen.has(visitKey)) {
      return [];
    }
    seen.add(visitKey);

    const tasks: QueueTargetTask[] = [];
    let sourceEntity: CollectionValues | null | undefined;

    if (scopedRule.queue) {
      sourceEntity ??= await this.collectionRepository.getCollectionById(
        sourceCollection,
        sourceId,
      );
      if (sourceEntity) {
        tasks.push({ queueRule: scopedRule.queue, target: sourceEntity });
      }
      return this.dedupeTasks(tasks);
    } else if (scopedRule.traverse) {
      const immediateTargets = await this.resolveImmediateTargets(
        sourceCollection,
        sourceId,
        scopedRule.traverse,
      );

      const config = await this.collectionRepository
        .getCollectionConfigByName(scopedRule.traverse.collection)
        .catch(() => null);
      const nestedRules = config?.syncQueues ?? [];
      const nestedScopedRule = this.findRuleByQueue(
        nestedRules,
        allowedQueue,
        scopedRule.traverse.collection,
      );

      for (const target of immediateTargets) {
        const nestedTasks = await this.resolveQueueTargets(
          scopedRule.traverse.collection,
          target.id.toString(),
          nestedScopedRule,
          allowedQueue,
          seen,
        );
        tasks.push(...nestedTasks);
      }

      return this.dedupeTasks(tasks);
    }
    throw new NotFoundException(
      `No applicable queue rule found for collection ${sourceCollection} and queue ${allowedQueue}`,
    );
  }

  private findRuleByQueue(
    rules: CollectionSyncQueueRuleDto[],
    allowedQueue: string,
    collection: CollectionNames,
  ): CollectionSyncQueueRuleDto {
    const matches = rules.filter((rule) => {
      if (rule.queue) {
        return rule.queue.queue === allowedQueue;
      }
      if (rule.traverse) {
        return rule.traverse.queues.includes(allowedQueue);
      }
      return false;
    });

    if (matches.length === 0) {
      throw new NotFoundException(
        `Sync config for collection ${collection} does not define a rule for queue ${allowedQueue}`,
      );
    }

    if (matches.length > 1) {
      throw new ConflictException(
        `Sync config is ambiguous for collection ${collection} queue ${allowedQueue}: found ${matches.length} matching rules`,
      );
    }

    return matches[0];
  }

  private async resolveImmediateTargets(
    sourceCollection: CollectionNames,
    sourceId: string,
    traverse: CollectionSyncTraversalRule,
  ): Promise<VertexPointerDto[]> {
    const source = await this.collectionRepository.getCollectionById(
      sourceCollection,
      sourceId,
    );
    if (!source) {
      return [];
    }

    const sourceVertexId = source.vertex.toString();
    const targetIndex = CollectionNameEnum[
      traverse.collection as CollectionNames
    ];

    const vertices =
      traverse.direction === 'downstream'
        ? await this.graphRepository.getDownstreamVertex(
            sourceVertexId,
            targetIndex,
            traverse.maxDepth ?? 8,
          )
        : await this.graphRepository.getUpstreamVertex(
            sourceVertexId,
            targetIndex,
            traverse.edgeNames ?? null,
            false,
            traverse.maxDepth ?? 8,
          );
    // console.log(`${vertices.length} vertices collection ${traverse.collection}:${sourceVertexId}:${targetIndex}`);
    // console.log(vertices);
    const targets = new Map<string, VertexPointerDto>();
    const resolvedTargets = vertices.map((vertex) => {
      return vertex.collection;
    });

    for (const target of resolvedTargets) {
      if (!target) {
        continue;
      }

      targets.set(target.id, target);
    }

    return Array.from(targets.values());
  }

  private async queueTarget(
    queueRule: QueueRuleConfig,
    target: CollectionValues,
  ): Promise<void> {
    const queueName = REDIS_QUEUES[queueRule.queue as keyof typeof REDIS_QUEUES];
    if (!queueName) {
      return;
    }

    this.redisService.queue(queueName, target.id);

    if (queueRule.queuedStatusProperty) {
      await this.graphService.updateSyncStatus(
        target as any,
        queueRule.queuedStatusProperty as any,
        'queuedAt',
      );
    }
  }

  private isRequirementMet(requirement: CollectionSyncRequirement): boolean {
    return this.getRequirementStatus(requirement).met;
  }

  private getRequirementStatus(requirement?: CollectionSyncRequirement): {
    met: boolean;
    unmetRequirements: string[];
  } {
    if (!requirement) {
      return { met: true, unmetRequirements: [] };
    }

    const unmetRequirements: string[] = [];

    if (requirement.envAll && requirement.envAll.length > 0) {
      for (const envName of requirement.envAll) {
        if (!this.isEnvironmentVariableSet(envName)) {
          unmetRequirements.push(`env:${envName}`);
        }
      }
    }

    // Requirements are evaluated from DB-configured env keys only.
    if (requirement.health) {
      unmetRequirements.push(`unsupported:health:${requirement.health}`);
    }

    return {
      met: unmetRequirements.length === 0,
      unmetRequirements,
    };
  }

  private isEnvironmentVariableSet(name: string): boolean {
    const value = process.env[name];
    return typeof value === 'string' && value.trim().length > 0;
  }

  private isQueueTargetEnabled(
    target: Record<string, unknown>,
    requiredEnabledProperty?: string,
  ): boolean {
    if (!requiredEnabledProperty) {
      return true;
    }

    return target[requiredEnabledProperty] === true;
  }

  private dedupeTasks(tasks: QueueTargetTask[]): QueueTargetTask[] {
    const dedupe = new Map<string, QueueTargetTask>();
    for (const task of tasks) {
      const key = `${task.queueRule.queue}:${task.target.id}`;
      dedupe.set(key, task);
    }
    return Array.from(dedupe.values());
  }

  private dedupeTargets(targets: CollectionValues[]): CollectionValues[] {
    const dedupe = new Map<string, CollectionValues>();
    for (const target of targets) {
      dedupe.set(target.id, target);
    }
    return Array.from(dedupe.values());
  }
}
