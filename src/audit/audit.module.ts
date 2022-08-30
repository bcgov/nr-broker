import { Module } from '@nestjs/common';
import { KinesisModule } from '../kinesis/kinesis.module';
import { AuditService } from './audit.service';

@Module({
  imports: [KinesisModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
