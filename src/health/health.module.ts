import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AuditModule } from '../audit/audit.module';
import { TokenModule } from '../token/token.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [AuditModule, TerminusModule, TokenModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
