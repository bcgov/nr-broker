import { Module } from '@nestjs/common';
import { AwsKinesisService } from './aws-kinesis.service';
import { FakeKinesisService } from './fake-kinesis.service';
import { KinesisService } from './kinesis.service';

function isUsingFakeKinesis() {
  return !process.env.APP_ENVIRONMENT;
}

const kinesisServiceProvider = {
  provide: KinesisService,
  useClass: isUsingFakeKinesis() ? FakeKinesisService : AwsKinesisService,
};
@Module({
  providers: [kinesisServiceProvider],
  exports: [KinesisService],
})
export class KinesisModule {}
