import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MongoDriver } from '@mikro-orm/mongodb';

import { HealthModule } from './health/health.module';
import { ProvisionModule } from './provision/provision.module';
import { TokenModule } from './token/token.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { AccessLogsMiddleware } from './access-logs.middleware';
import { AwsModule } from './aws/aws.module';
import { IntentionModule } from './intention/intention.module';
import { PersistenceModule } from './persistence/persistence.module';
import { GraphModule } from './graph/graph.module';
import { CollectionModule } from './collection/collection.module';
import { getMongoDbConnectionUrl } from './persistence/mongo/mongo.util';
import { PreferenceModule } from './preference/preference.module';
import { RedisModule } from './redis/redis.module';
import { SystemModule } from './system/system.module';
import { PackageModule } from './package/package.module';
import { VaultModule } from './vault/vault.module';
import { GithubModule } from './github/github.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: true,
    }),
    ScheduleModule.forRoot(),
    MikroOrmModule.forRoot({
      autoLoadEntities: true,
      clientUrl: getMongoDbConnectionUrl(),
      driver: MongoDriver,
      ensureIndexes: true,
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
    AwsModule,
    PersistenceModule,
    GraphModule,
    CollectionModule,
    PreferenceModule,
    RedisModule,
    SystemModule,
    PackageModule,
    VaultModule,
    GithubModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AccessLogsMiddleware).forRoutes('*');
  }
}
