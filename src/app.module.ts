import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { ProvisionModule } from './provision/provision.module';
import { TokenModule } from './token/token.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
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
    TypeOrmModule.forRoot({
      ...{
        type: 'mongodb',
        host: process.env.DB_HOST ?? 'localhost',
        port: process.env.DB_PORT
          ? Number.parseInt(process.env.DB_PORT)
          : 27017,
        username: process.env.DB_USERNAME ?? 'mongoadmin',
        password: process.env.DB_PASSWORD ?? 'secret',
        database: process.env.DB_DATABASE ?? 'broker',
        authSource: process.env.DB_AUTH_SOURCE ?? 'admin',
        synchronize: true,
        autoLoadEntities: true,
        useUnifiedTopology: true,
      },
      ...(process.env.DB_SSL_CA && process.env.DB_SSL_CERT
        ? {
            ssl: true,
            sslValidate: true,
            sslCA: process.env.DB_SSL_CA,
            sslCert: process.env.DB_SSL_CERT,
          }
        : {}),
    }),
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
