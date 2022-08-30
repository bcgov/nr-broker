import { Module } from '@nestjs/common';
import { AwsKinesisService } from './aws-kinesis.service';
import { FakeKinesisService } from './fake-kinesis.service';
import { KinesisService } from './kinesis.service';

const kinesisServiceProvider = {
  provide: KinesisService,
  useClass: !process.env.APP_ENVIRONMENT
    ? FakeKinesisService
    : AwsKinesisService,
};

@Module({
  providers: [kinesisServiceProvider],
  exports: [KinesisService],
})
export class KinesisModule {}
