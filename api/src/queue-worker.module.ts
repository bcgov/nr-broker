import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MongoDriver } from '@mikro-orm/mongodb';
import { ReflectMetadataProvider } from '@mikro-orm/decorators/legacy';

import { GithubModule } from './github/github.module';
import { KubernetesModule } from './kubernetes/kubernetes.module';
import { CommunicationModule } from './communication/communication.module';
import { TokenModule } from './token/token.module';
import { IntentionModule } from './intention/intention.module';
import { CollectionModule } from './collection/collection.module';
import { GraphModule } from './graph/graph.module';
import { BullModule } from './bull/bull.module';
import { getMongoDbConnectionUrl } from './persistence/mongo/mongo.util';

/**
 * Minimal container for the standalone queue worker.
 *
 * This module reuses the same consumer services as the main application but is
 * intentionally smaller: it starts no HTTP server and imports no
 * `ScheduleModule`, so none of the consumer `@Cron` pollers are scheduled. The
 * `queue-worker.ts` entry point drives the enabled queue(s) directly on its own
 * interval instead.
 *
 * `JobQueueUtil` still gates processing on `QUEUE_PROCESSING`, so a worker run
 * with `QUEUE_PROCESSING=notification-coms` only processes that queue.
 */
@Module({
  imports: [
    MikroOrmModule.forRoot({
      autoLoadEntities: true,
      clientUrl: getMongoDbConnectionUrl(),
      driver: MongoDriver,
      ensureIndexes: true,
      metadataProvider: ReflectMetadataProvider,
    }),
    GithubModule,
    KubernetesModule,
    CommunicationModule,
    // `TokenModule` brings in `TokenService`, which registers the broker's own
    // Vault token refresh as a leader queue job in `onModuleInit`.
    // `ScheduleModule` is intentionally absent from this container, so the
    // leader worker (started by `BullService.onModuleInit`) is the sole driver.
    TokenModule,
    // The following modules own the former `IS_PRIMARY_NODE` leader crons, now
    // BullMQ repeatable jobs. They are imported so their `onModuleInit`
    // registers those jobs with `BullService`.
    IntentionModule,
    CollectionModule,
    GraphModule,
    // BullMQ owns all data-queue workers and the leader jobs.
    BullModule,
  ],
})
export class QueueWorkerModule {}
