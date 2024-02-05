import { Module } from '@nestjs/common';
import { KinesisModule } from '../kinesis/kinesis.module';
import { AuditService } from './audit.service';
import { AuditStreamerService } from './audit-streamer.service';

/**
 * The audit module supports other modules by providing a support service
 * used to output audit messages.
 */
@Module({
  imports: [KinesisModule],
  providers: [AuditService, AuditStreamerService],
  exports: [AuditService],
})
export class AuditModule {}
