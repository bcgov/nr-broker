import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CollectionNames } from '../persistence/dto/collection-dto-union.type';
import { SyncCollectionQuery } from './dto/sync-collection-query.dto';
import { REDIS_QUEUES } from '../constants';
import { CollectionNameEnum } from '../persistence/entity/collection-entity-union.type';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { RedisService } from '../redis/redis.service';
import { GraphService } from '../graph/graph.service';
import { GithubSyncService } from '../github/github-sync.service';
import {
  CollectionSyncQueueRule,
} from '../persistence/dto/collection-config.dto';

type SyncStatusProperty = 'syncSecretsStatus' | 'syncUsersStatus';

@Injectable()
export class CollectionSyncService {
  constructor(
    private readonly collectionRepository: CollectionRepository,
    private readonly graphRepository: GraphRepository,
    private readonly graphService: GraphService,
    private readonly redisService: RedisService,
    private readonly githubSyncService: GithubSyncService,
  ) {}

  async refresh(
    collection: CollectionNames,
    id: string,
    query: SyncCollectionQuery,
  ): Promise<void> {
    const collectionConfig = await this.collectionRepository
      .getCollectionConfigByName(collection)
      .catch(() => null);
    const rules = collectionConfig?.syncQueues;
    if (!rules || rules.length === 0) {
      throw new NotFoundException(
        `Sync is not supported for collection ${collection}`,
      );
    }

    for (const rule of rules) {
      if (!this.isRuleEnabled(rule, query)) {
        continue;
      }

      if (rule.requiresGithubEnabled && !this.githubSyncService.isEnabled()) {
        throw new ServiceUnavailableException('Github is not setup');
      }

      const targetIds = await this.resolveTargetIds(collection, id, rule);
      for (const targetId of targetIds) {
        await this.queueTarget(rule, targetId);
      }
    }
  }

  private isRuleEnabled(
    rule: CollectionSyncQueueRule,
    query: SyncCollectionQuery,
  ): boolean {
    if (!rule.queryOption) {
      return true;
    }

    const value = query[rule.queryOption];
    if (value === undefined) {
      return rule.defaultWhenOptionMissing;
    }

    return value;
  }

  private async resolveTargetIds(
    sourceCollection: CollectionNames,
    sourceId: string,
    rule: CollectionSyncQueueRule,
  ): Promise<string[]> {
    if (!rule.traversal) {
      return [sourceId];
    }

    const source = await this.collectionRepository.getCollectionById(
      sourceCollection,
      sourceId,
    );
    if (!source) {
      return [];
    }

    const sourceVertexId = source.vertex.toString();
    const targetIndex = CollectionNameEnum[
      rule.traversal.collection as CollectionNames
    ];

    const vertices =
      rule.traversal.direction === 'downstream'
        ? await this.graphRepository.getDownstreamVertex(
            sourceVertexId,
            targetIndex,
            rule.traversal.maxDepth ?? 8,
          )
        : await this.graphRepository.getUpstreamVertex(
            sourceVertexId,
            targetIndex,
            rule.traversal.edgeNames ?? null,
          );

    const ids = new Set<string>();
    for (const vertex of vertices) {
      ids.add(vertex.collection.id);
    }

    return Array.from(ids);
  }

  private async queueTarget(
    rule: CollectionSyncQueueRule,
    targetId: string,
  ): Promise<void> {
    const target = await this.collectionRepository.getCollectionById(
      rule.targetCollection as CollectionNames,
      targetId,
    );
    if (!target) {
      return;
    }

    if (
      rule.requiredEnabledProperty &&
      !target[rule.requiredEnabledProperty]
    ) {
      return;
    }

    const queueName = REDIS_QUEUES[rule.queue as keyof typeof REDIS_QUEUES];
    if (!queueName) {
      return;
    }

    this.redisService.queue(queueName, targetId);

    if (rule.queuedStatusProperty) {
      await this.graphService.updateSyncStatus(
        target as any,
        rule.queuedStatusProperty as SyncStatusProperty,
        'queuedAt',
      );
    }
  }
}
