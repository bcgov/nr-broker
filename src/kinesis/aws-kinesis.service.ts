import { Kinesis, PutRecordCommand } from '@aws-sdk/client-kinesis';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { Injectable, Logger } from '@nestjs/common';
import { KinesisService } from './kinesis.service';
import { AWS_REGION } from '../constants';

@Injectable()
export class AwsKinesisService extends KinesisService {
  private readonly logger = new Logger(AwsKinesisService.name);
  private client;
  private readonly enc = new TextEncoder();
  protected identityAssumed = false;
  constructor() {
    super();
    this.assumeIdentity();
  }

  /**
   * Assume the identity required to make API requests
   */
  public async assumeIdentity(): Promise<void> {
    if (!this.identityAssumed) {
      const stsClient1 = new STSClient({
        region: process.env.AWS_DEFAULT_REGION || AWS_REGION,
      });
      const stsAssumeRoleCommand = new AssumeRoleCommand({
        RoleArn: process.env.AWS_ROLE_ARN,
        RoleSessionName: 'broker',
      });
      const stsAssumedRole = await stsClient1.send(stsAssumeRoleCommand);
      if (stsAssumedRole && stsAssumedRole.Credentials) {
        // Overwrite the environment variables so later requests use assumed identity
        process.env.AWS_ACCESS_KEY_ID = stsAssumedRole.Credentials.AccessKeyId;
        process.env.AWS_SECRET_ACCESS_KEY =
          stsAssumedRole.Credentials.SecretAccessKey;
        process.env.AWS_SESSION_TOKEN = stsAssumedRole.Credentials.SessionToken;
        this.identityAssumed = true;
        console.log('Identity assumed');

        this.client = new Kinesis({
          region: process.env.AWS_DEFAULT_REGION || AWS_REGION,
        });
      }
    }
  }

  putRecord(partitionKey: string, data: any) {
    this.logger.debug(`putRecord: ${JSON.stringify(data)}`);
    const command = new PutRecordCommand({
      PartitionKey: partitionKey,
      StreamName: process.env.AWS_KINESIS_STREAM,
      Data: this.enc.encode(JSON.stringify(data)),
    });
    this.client.send(command);
  }
}
