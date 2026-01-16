import { Module } from '@nestjs/common';
import { AwsKinesisService } from './aws-kinesis.service';
import { FakeKinesisService } from './fake-kinesis.service';
import { KinesisService } from './kinesis.service';
import { AwsService } from './aws.service';
import { FakeOpensearchService } from './fake-opensearch.service';
import { AwsOpensearchService } from './aws-opensearch.service';
import { OpensearchService } from './opensearch.service';
import { APP_ENVIRONMENT, AWS_OPENSEARCH_HOST } from '../constants';

function useAwsServices(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_ROLE_ARN
  );
}

const kinesisServiceProvider = {
  provide: KinesisService,
  useClass:
    !useAwsServices() || APP_ENVIRONMENT === ''
      ? FakeKinesisService
      : AwsKinesisService,
};

const opensearchServiceProvider = {
  provide: OpensearchService,
  useClass:
    !useAwsServices() || AWS_OPENSEARCH_HOST === ''
      ? FakeOpensearchService
      : AwsOpensearchService,
};

/**
 * The kinesis module provides a services for sending audit data to AWS Kinesis.
 */
@Module({
  providers: [
    ...(!useAwsServices() ? [] : [AwsService]),
    kinesisServiceProvider,
    opensearchServiceProvider,
  ],
  exports: [KinesisService, OpensearchService],
})
export class AwsModule {}
