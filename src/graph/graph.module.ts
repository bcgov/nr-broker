import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { UtilModule } from '../util/util.module';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';
import { AuthModule } from '../auth/auth.module';
import { IntentionSyncService } from './intention-sync.service';

/**
 * The graph module allows users to interact with the graph database.
 */
@Module({
  imports: [AuthModule, AuditModule, PersistenceModule, UtilModule],
  controllers: [GraphController],
  providers: [GraphService, IntentionSyncService],
  exports: [GraphService, IntentionSyncService],
})
export class GraphModule {}
