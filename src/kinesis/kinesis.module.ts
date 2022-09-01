import { Logger, Module } from '@nestjs/common';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { Kinesis } from '@aws-sdk/client-kinesis';
import { AwsKinesisService } from './aws-kinesis.service';
import { FakeKinesisService } from './fake-kinesis.service';
import { KinesisService } from './kinesis.service';
import { AWS_REGION } from '../constants';

function isUsingFakeKinesis() {
  return !process.env.APP_ENVIRONMENT;
}

const kinesisServiceProvider = {
  provide: KinesisService,
  useClass: isUsingFakeKinesis() ? FakeKinesisService : AwsKinesisService,
};
@Module({
  providers: [
    kinesisServiceProvider,
    {
      provide: 'AWS_KINESIS_CLIENT',
      useFactory: async () => {
        if (isUsingFakeKinesis()) {
          return undefined;
        }
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
          process.env.AWS_ACCESS_KEY_ID =
            stsAssumedRole.Credentials.AccessKeyId;
          process.env.AWS_SECRET_ACCESS_KEY =
            stsAssumedRole.Credentials.SecretAccessKey;
          process.env.AWS_SESSION_TOKEN =
            stsAssumedRole.Credentials.SessionToken;
          logger.log('Identity assumed');
          return new Kinesis({
            region: process.env.AWS_DEFAULT_REGION || AWS_REGION,
          });
        }
      },
    },
  ],
  exports: [KinesisService],
})
export class KinesisModule {}

const logger = new Logger(KinesisModule.name);
