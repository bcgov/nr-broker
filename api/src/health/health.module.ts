import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AuditModule } from '../audit/audit.module';
import { GithubModule } from '../github/github.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { CommunicationModule } from '../communication/communication.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { TokenModule } from '../token/token.module';

/**
 * The health module reports on the overall status of broker.
 */
@Module({
  imports: [
    AuditModule,
    CommunicationModule,
    GithubModule,
    PersistenceModule,
    TerminusModule,
    TokenModule,
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
