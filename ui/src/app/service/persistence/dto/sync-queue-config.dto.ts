// Shared DTO: Copy in back-end and front-end should be identical
export enum SyncType {
  SECRETS = 'secrets',
  USERS = 'users',
}

export class CollectionSyncRequirement {
  health?: string;
  value?: boolean | string;
  envAll?: string[];
}

export class SyncQueueSetupDto {
  gitHubUserLink?: boolean;
}

export class SyncQueueConfigDto {
  queue!: string;
  label!: string;
  summary!: string;
  description!: string[];
  types!: string[];
  setup?: SyncQueueSetupDto;
  requires?: CollectionSyncRequirement;
}

export class SyncQueueConfigResponseDto {
  queues!: SyncQueueConfigDto[];
}
