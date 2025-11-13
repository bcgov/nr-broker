import { Kinesis, PutRecordsCommand } from '@aws-sdk/client-kinesis';
import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { Subject, bufferTime, filter, take, lastValueFrom } from 'rxjs';
import { KinesisService } from './kinesis.service';
import { AWS_KINESIS_BUFFER_TIME, AWS_KINESIS_MAX_RECORDS } from '../constants';
import { AwsService } from './aws.service';

@Injectable()
export class AwsKinesisService extends KinesisService {
  private readonly enc = new TextEncoder();
  private recordSubject = new Subject<Kinesis>();

  constructor(private readonly aws: AwsService) {
    super();
    this.initRecordSubject();
  }

  private initRecordSubject() {
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
          const client = await lastValueFrom(
            this.aws.getKinesisClient().pipe(take(1)),
          );
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
}
