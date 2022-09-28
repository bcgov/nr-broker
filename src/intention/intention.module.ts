import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { IntentionController } from './intention.controller';
import { IntentionService } from './intention.service';

@Module({
  imports: [PersistenceModule, AuditModule],
  controllers: [IntentionController],
  providers: [IntentionService],
})
export class IntentionModule {}
