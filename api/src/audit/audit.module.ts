import { Module } from '@nestjs/common';
import { AwsModule } from '../aws/aws.module';
import { UtilModule } from '../util/util.module';
import { AuditService } from './audit.service';
import { AuditStreamerService } from './audit-streamer.service';

/**
 * The audit module supports other modules by providing a support service
 * used to output audit messages.
 */
@Module({
  imports: [AwsModule, UtilModule],
  providers: [AuditService, AuditStreamerService],
  exports: [AuditService],
})
export class AuditModule {}
