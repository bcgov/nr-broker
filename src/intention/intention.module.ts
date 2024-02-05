import { Module, forwardRef } from '@nestjs/common';
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

/**
 * The intention module allows broker accounts to interact with intentions.
 */
@Module({
  imports: [
    AuthModule,
    AuditModule,
    forwardRef(() => CollectionModule),
    GraphModule,
    PersistenceModule,
    UtilModule,
  ],
  controllers: [IntentionController],
  providers: [IntentionService, ActionService, ActionUtil],
  exports: [ActionUtil, ActionService, IntentionService],
})
export class IntentionModule {}
