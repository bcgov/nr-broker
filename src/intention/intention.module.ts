import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { CollectionModule } from '../collection/collection.module';
import { GraphModule } from '../graph/graph.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { UtilModule } from '../util/util.module';
import { IntentionController } from './intention.controller';
import { IntentionService } from './intention.service';
import { ActionService } from './action.service';
import { ActionUtil } from '../util/action.util';

@Module({
  imports: [
    AuthModule,
    AuditModule,
    CollectionModule,
    GraphModule,
    PersistenceModule,
    UtilModule,
  ],
  controllers: [IntentionController],
  providers: [IntentionService, ActionService, ActionUtil],
  exports: [ActionUtil, ActionService],
})
export class IntentionModule {}
