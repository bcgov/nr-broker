import { Module } from '@nestjs/common';
import { PersistenceModule } from '../persistence/persistence.module';
import { IntentionController } from './intention.controller';
import { IntentionService } from './intention.service';

@Module({
  imports: [PersistenceModule],
  controllers: [IntentionController],
  providers: [IntentionService],
})
export class IntentionModule {}
