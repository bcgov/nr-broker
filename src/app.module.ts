import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';

import { HealthModule } from './health/health.module';
import { ProvisionModule } from './provision/provision.module';
import { TokenModule } from './token/token.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { AccessLogsMiddleware } from './access-logs.middleware';
import { KinesisModule } from './kinesis/kinesis.module';
import { IntentionModule } from './intention/intention.module';
import { PersistenceModule } from './persistence/persistence.module';
import { GraphModule } from './graph/graph.module';
import { CollectionModule } from './collection/collection.module';
import { getMongoDbConnectionUrl } from './persistence/mongo/mongo.util';
import { PreferenceModule } from './preference/preference.module';
import { RedisModule } from './redis/redis.module';

/**
 * Convenience function for converting an environment variable to an object
 * @param key Object key
 * @param envName Name of environment variable
 * @returns Object
 */
function envToObj(key: string, envName: string) {
  return process.env[envName]
    ? {
        [key]: process.env[envName],
      }
    : {};
}

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      ...{
        type: 'mongodb',
        url: getMongoDbConnectionUrl(),
        useNewUrlParser: true,
        synchronize: true,
        autoLoadEntities: true,
        useUnifiedTopology: true,
      },
      ...(process.env.DB_SSL
        ? {
            ssl: true,
            sslValidate: true,
          }
        : {}),
      ...envToObj('sslCA', 'DB_SSL_CA'),
      ...envToObj('sslCert', 'DB_SSL_CERT'),
      ...envToObj('sslKey', 'DB_SSL_KEY'),
      ...envToObj('sslPass', 'DB_SSL_PASS'),
      ...envToObj('sslCRL', 'DB_SSL_CRL'),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', process.env.NESTJS_UI_ROOT_PATH),
    }),
    HealthModule,
    IntentionModule,
    ProvisionModule,
    TokenModule,
    AuditModule,
    AuthModule,
    KinesisModule,
    PersistenceModule,
    GraphModule,
    CollectionModule,
    PreferenceModule,
    RedisModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AccessLogsMiddleware).forRoutes('*');
  }
}
