import { KinesisClient, PutRecordCommand } from '@aws-sdk/client-kinesis';
import { Injectable, Logger } from '@nestjs/common';
import { KinesisService } from './kinesis.service';
import { AWS_REGION } from '../constants';

@Injectable()
export class AwsKinesisService extends KinesisService {
  private readonly logger = new Logger(AwsKinesisService.name);
  private readonly client = new KinesisClient({
    region: process.env.AWS_DEFAULT_REGION || AWS_REGION,
  });
  private readonly enc = new TextEncoder();

  putRecord(partitionKey: string, data: any) {
    const command = new PutRecordCommand({
      PartitionKey: partitionKey,
      StreamName: process.env.DLQ_STREAM_NAME,
      Data: this.enc.encode(JSON.stringify(data)),
    });
    this.client.send(command);
  }
}
