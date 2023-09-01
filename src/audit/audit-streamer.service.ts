import { Injectable, Logger } from '@nestjs/common';
import * as FileStreamRotator from 'file-stream-rotator';
import { KinesisService } from '../kinesis/kinesis.service';
import {
  AUDIT_LOGSTREAM_DIR,
  AUDIT_LOGSTREAM_MAX_LOGS,
  AUDIT_LOGSTREAM_SIZE,
} from '../constants';

@Injectable()
export class AuditStreamerService {
  private readonly logger = new Logger(AuditStreamerService.name);
  private readonly rotatingLogStream: any;

  /**
   * Constructs the audit service
   * @param kinesisService The Kinesis service to send audit logs to
   */
  constructor(private readonly kinesisService: KinesisService) {
    this.rotatingLogStream = FileStreamRotator.getStream({
      filename: `${AUDIT_LOGSTREAM_DIR}/nr-broker-audit-%DATE%`,
      frequency: 'daily',
      date_format: 'YYYY-MM-DD',
      size: AUDIT_LOGSTREAM_SIZE,
      max_logs: AUDIT_LOGSTREAM_MAX_LOGS,
      audit_file: `${AUDIT_LOGSTREAM_DIR}/nr-broker-audit.json`,
      extension: '.log',
      create_symlink: true,
      symlink_name: 'nr-broker-tail-current.log',
    });
  }

  putRecord(data: any) {
    const stringData = JSON.stringify(data);
    this.logger.debug(stringData);
    this.rotatingLogStream.write(stringData);
    this.kinesisService.putRecord(data);
  }
}
