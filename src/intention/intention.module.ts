import { Module } from '@nestjs/common';
import { IntentionController } from './intention.controller';
import { IntentionService } from './intention.service';

@Module({
  controllers: [IntentionController],
  providers: [IntentionService],
})
export class IntentionModule {}
