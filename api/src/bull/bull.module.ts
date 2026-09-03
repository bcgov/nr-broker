import { Module } from '@nestjs/common';
import { BullService, buildBullConnection } from './bull.service';
import { QUEUE_PROCESSING } from '../constants';

/**
 * Provides {@link BullService}, the central owner of all BullMQ queues,
 * workers, and the shared Redis connection.
 *
 * The Redis connection is created via a factory so both the BullMQ workers and
 * the existing persistence `REDIS_CLIENT` target the same Redis (the `REDIS_*`
 * env vars). `BullService` gates the BullMQ data-queue workers by
 * `QUEUE_PROCESSING`, preserving per-process queue assignment.
 */
@Module({
  providers: [
    {
      provide: 'BULL_REDIS_CONNECTION',
      useFactory: () => buildBullConnection(),
    },
    {
      provide: BullService,
      useFactory: (connection) => new BullService(connection, QUEUE_PROCESSING),
      inject: ['BULL_REDIS_CONNECTION'],
    },
  ],
  exports: [BullService],
})
export class BullModule {}
