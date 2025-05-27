import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailQueueService } from './email-queue.service';
import { UtilModule } from '../util/util.module';
import { RedisModule } from '../redis/redis.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [UtilModule, RedisModule, AuditModule],
  providers: [EmailService, EmailQueueService],
  exports: [EmailService],
})
export class CommunicationModule {}
