import { CollectionNames } from './collection-dto-union.type';

export class CollectionSyncTraversalRule {
  collection!: CollectionNames;
  direction!: 'downstream' | 'upstream';
  maxDepth?: number;
  edgeNames?: string[];
  queues!: string[];
}

export class CollectionSyncQueueConfig {
  queue!: string;
  requiredEnabledProperty?: string;
  queuedStatusProperty?: string;
}

export class CollectionSyncQueueRuleDto {
  queue?: CollectionSyncQueueConfig;
  traverse?: CollectionSyncTraversalRule;
}

export { CollectionSyncQueueRuleDto as CollectionSyncQueueRule };
