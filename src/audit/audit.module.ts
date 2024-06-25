import { Module } from '@nestjs/common';
import { AwsModule } from '../aws/aws.module';
import { AuditService } from './audit.service';
import { AuditStreamerService } from './audit-streamer.service';

/**
 * The audit module supports other modules by providing a support service
 * used to output audit messages.
 */
@Module({
  imports: [AwsModule],
  providers: [AuditService, AuditStreamerService],
  exports: [AuditService],
})
export class AuditModule {}
