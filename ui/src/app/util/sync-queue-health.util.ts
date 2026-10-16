import {
  SyncQueueConfigDto,
  SyncType,
} from '../service/persistence/dto/sync-queue-config.dto';

export type SyncQueueHealthRecord = Record<string, { enabled?: boolean }>;

export function hasEnabledQueueForSyncType(
  queues: SyncQueueHealthRecord | undefined,
  syncQueueConfigRecord: Record<string, SyncQueueConfigDto>,
  syncType: SyncType,
): boolean {
  if (!queues) {
    return false;
  }

  return Object.entries(queues).some(([queueName, queueHealth]) => {
    if (!queueHealth?.enabled) {
      return false;
    }

    const config = syncQueueConfigRecord[queueName];
    return config?.types?.includes(syncType) === true;
  });
}
