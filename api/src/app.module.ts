import { MiddlewareConsumer, Module, OnModuleInit, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/mongodb';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MongoDriver } from '@mikro-orm/mongodb';
import { ReflectMetadataProvider } from '@mikro-orm/decorators/legacy';

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
import { CommunicationModule } from './communication/communication.module';

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
      metadataProvider: ReflectMetadataProvider,
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
    CommunicationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);
  constructor(private readonly em: EntityManager) {}

  async onModuleInit() {
    // Test the database connection on startup and log the result. MikroORM does not normally establish a
    // connection until the first database operation is performed. Health checks should be used to monitor
    // the connection after startup.
    try {
      await this.em.getConnection().connect();
      this.logger.log('MikroORM database connection established.');
    } catch (err) {
      this.logger.error('MikroORM database connection failed:', err);
    }
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AccessLogsMiddleware).forRoutes('*');
  }
}
