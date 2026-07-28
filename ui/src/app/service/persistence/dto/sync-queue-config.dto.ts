// Shared DTO: Copy in back-end and front-end should be identical
export class CollectionSyncRequirement {
  health!: string;
  value!: boolean | string;
}

export class SyncQueueConfigDto {
  queue!: string;
  label!: string;
  summary!: string;
  description!: string[];
  requires?: CollectionSyncRequirement;
}

export class SyncQueueConfigResponseDto {
  queues!: SyncQueueConfigDto[];
}
