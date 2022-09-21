import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { ProvisionModule } from './provision/provision.module';
import { TokenModule } from './token/token.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { AccessLogsMiddleware } from './access-logs.middleware';
import { KinesisModule } from './kinesis/kinesis.module';
import { IntentionModule } from './intention/intention.module';
import { PersistenceModule } from './persistence/persistence.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: true,
    }),
    ScheduleModule.forRoot(),
    HealthModule,
    IntentionModule,
    ProvisionModule,
    TokenModule,
    AuditModule,
    AuthModule,
    KinesisModule,
    PersistenceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AccessLogsMiddleware).forRoutes('*');
  }
}
