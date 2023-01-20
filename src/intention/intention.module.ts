import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { IntentionController } from './intention.controller';
import { IntentionService } from './intention.service';
import { ActionService } from './action.service';
import { ActionUtil } from './action.util';

@Module({
  imports: [PersistenceModule, AuditModule],
  controllers: [IntentionController],
  providers: [IntentionService, ActionService, ActionUtil],
  exports: [ActionUtil],
})
export class IntentionModule {}
