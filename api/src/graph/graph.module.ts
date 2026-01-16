import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { UtilModule } from '../util/util.module';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../redis/redis.module';
import { AwsModule } from '../aws/aws.module';
import { IntentionSyncService } from './intention-sync.service';
import { GraphSyncService } from './graph-sync/graph-sync.service';

/**
 * The graph module allows users to interact with the graph database.
 */
@Module({
  imports: [
    AuthModule,
    AwsModule,
    AuditModule,
    PersistenceModule,
    RedisModule,
    UtilModule,
  ],
  controllers: [GraphController],
  providers: [GraphService, IntentionSyncService, GraphSyncService],
  exports: [GraphService, IntentionSyncService],
})
export class GraphModule {}
