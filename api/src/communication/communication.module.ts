import { Module } from '@nestjs/common';
import { CommunicationEmailService } from './communication-email.service';
import { CommunicationQueueService } from './communication-queue.service';
import { UtilModule } from '../util/util.module';
import { RedisModule } from '../redis/redis.module';
import { AuditModule } from '../audit/audit.module';

import {
  NOTIFICATION_EMAIL_HOST,
  NOTIFICATION_EMAIL_SECURE,
  NOTIFICATION_EMAIL_PORT,
} from '../constants';
import { CommunicationDummyService } from './communication-dummy.service';
import {
  COMMUNICATION_EMAIL_TRANSPORT,
  COMMUNICATION_TASKS,
} from './communication.constants';
// import { GraphModule } from '../graph/graph.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { CommunicationController } from './communication.controller';
import { CommunicationHealthIndicator } from './communication.health';
import { TerminusModule } from '@nestjs/terminus';

function useEmailComs(): boolean {
  return !!(
    process.env.NOTIFICATION_EMAIL_HOST &&
    process.env.NOTIFICATION_EMAIL_PORT &&
    process.env.NOTIFICATION_EMAIL_FROM
  );
}

const communicationServiceProviderInject = [];
if (useEmailComs()) {
  communicationServiceProviderInject.push(CommunicationEmailService);
}
// Use dummy service for testing
if (!useEmailComs()) {
  communicationServiceProviderInject.push(CommunicationDummyService);
}

const communicationServiceProvider = {
  provide: COMMUNICATION_TASKS,
  useFactory: (...args) => args,
  inject: communicationServiceProviderInject,
};

@Module({
  imports: [
    AuditModule,
    PersistenceModule,
    RedisModule,
    TerminusModule,
    UtilModule,
  ],
  controllers: [CommunicationController],
  providers: [
    {
      provide: COMMUNICATION_EMAIL_TRANSPORT,
      useValue: {
        host: NOTIFICATION_EMAIL_HOST,
        port: NOTIFICATION_EMAIL_PORT,
        secure: NOTIFICATION_EMAIL_SECURE, // Use TLS if true
      },
    },
    CommunicationDummyService,
    CommunicationEmailService,
    communicationServiceProvider,
    CommunicationQueueService,
    CommunicationHealthIndicator,
  ],
  exports: [CommunicationQueueService, CommunicationHealthIndicator],
})
export class CommunicationModule {}
