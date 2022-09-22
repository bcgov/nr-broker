import { Kinesis, PutRecordsCommand } from '@aws-sdk/client-kinesis';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  Subject,
  bufferTime,
  filter,
  take,
  Observable,
  switchMap,
  shareReplay,
  asyncScheduler,
  lastValueFrom,
} from 'rxjs';
import { KinesisService } from './kinesis.service';
import {
  AWS_KINESIS_BUFFER_TIME,
  AWS_KINESIS_MAX_RECORDS,
  AWS_REGION,
  TOKEN_RENEW_RATIO,
} from '../constants';

@Injectable()
export class AwsKinesisService extends KinesisService {
  private readonly logger = new Logger(AwsKinesisService.name);
  private readonly enc = new TextEncoder();
  private recordSubject = new Subject<Kinesis>();
  private reload$ = new Subject<void>();
  private cache$: Observable<Kinesis>;

  private initialEnv: {
    AWS_ACCESS_KEY_ID: string;
    AWS_SECRET_ACCESS_KEY: string;
    AWS_SESSION_TOKEN: string;
  } = {
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_SESSION_TOKEN: process.env.AWS_SESSION_TOKEN,
  };

  getClient() {
    if (!this.cache$) {
      this.cache$ = this.reload$.pipe(
        switchMap(() => this.connectKinesis()),
        shareReplay(1),
      );
      // empty subscribe to kick it off
      this.cache$.subscribe();
      this.reload$.next(null);
    }

    return this.cache$;
  }
  constructor() {
    super();
    this.getClient();
    this.recordSubject
      .pipe(
        bufferTime(AWS_KINESIS_BUFFER_TIME, undefined, AWS_KINESIS_MAX_RECORDS),
        filter((arr) => arr.length > 0),
      )
      .subscribe(async (dataArr) => {
        const command = new PutRecordsCommand({
          StreamName: process.env.AWS_KINESIS_STREAM,
          Records: dataArr.map((data) => {
            const strData = JSON.stringify(data);
            const hash = createHash('sha1').update(strData).digest('base64');
            return {
              PartitionKey: hash,
              Data: this.enc.encode(strData),
            };
          }),
        });
        try {
          const client = await lastValueFrom(this.getClient().pipe(take(1)));
          const response = await client.send(command);
          // If throughput exceeded... try again (and again)
          if (response.FailedRecordCount && response.FailedRecordCount > 0) {
            response.Records.filter(
              (record) =>
                record.ErrorMessage &&
                record.ErrorMessage ===
                  'ProvisionedThroughputExceededException',
            ).forEach((record, i) => this.putRecord(dataArr[i]));
          }
        } catch (error) {
          // error handling.
        } finally {
          // finally.
        }
      });
  }

  public putRecord(data: any): void {
    // this.logger.debug(`putRecord: ${JSON.stringify(data)}`);
    this.recordSubject.next(data);
  }

  private async connectKinesis() {
    // Reset env
    process.env.AWS_ACCESS_KEY_ID = this.initialEnv.AWS_ACCESS_KEY_ID;
    process.env.AWS_SECRET_ACCESS_KEY = this.initialEnv.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_SESSION_TOKEN;
    const stsClient1 = new STSClient({
      region: process.env.AWS_DEFAULT_REGION || AWS_REGION,
    });
    const stsAssumeRoleCommand = new AssumeRoleCommand({
      RoleArn: process.env.AWS_KINESIS_ROLE_ARN,
      RoleSessionName: 'broker',
    });
    // Send command
    const stsAssumedRole = await stsClient1.send(stsAssumeRoleCommand);
    if (stsAssumedRole && stsAssumedRole.Credentials) {
      // Overwrite the environment variables so later requests use assumed identity
      process.env.AWS_ACCESS_KEY_ID = stsAssumedRole.Credentials.AccessKeyId;
      process.env.AWS_SECRET_ACCESS_KEY =
        stsAssumedRole.Credentials.SecretAccessKey;
      process.env.AWS_SESSION_TOKEN = stsAssumedRole.Credentials.SessionToken;
      const renewAt = Math.round(
        (new Date(stsAssumedRole.Credentials.Expiration).getTime() -
          new Date().getTime()) *
          TOKEN_RENEW_RATIO,
      );
      this.logger.log(
        `Identity assumed (valid till: ${stsAssumedRole.Credentials.Expiration}, renew in: ${renewAt})`,
      );
      // Schedule renewal
      asyncScheduler.schedule(() => {
        this.reload$.next();
      }, renewAt);
      return new Kinesis({
        region: process.env.AWS_DEFAULT_REGION || AWS_REGION,
      });
    }
  }
}
