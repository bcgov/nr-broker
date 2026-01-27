import { Logger, Module } from '@nestjs/common';
import { createClient, createCluster } from 'redis';
import { MikroOrmModule } from '@mikro-orm/nestjs';

import { BuildRepository } from './interfaces/build.repository';
import { CollectionRepository } from './interfaces/collection.repository';
import { GraphRepository } from './interfaces/graph.repository';
import { IntentionRepository } from './interfaces/intention.repository';
import { SystemRepository } from './interfaces/system.repository';

import { BuildMongoRepository } from './mongo/build-mongo.repository';
import { CollectionMongoRepository } from './mongo/collection-mongo.repository';
import { GraphMongoRepository } from './mongo/graph-mongo.repository';
import { IntentionMongoRepository } from './mongo/intention-mongo.repository';
import { SystemMongoRepository } from './mongo/system-mongo.repository';
import { GraphRedisRepository } from './redis-composition/graph-redis.repository';

import { PersistenceUtilService } from './persistence-util.service';
import { PersistenceRedisUtilService } from './persistence-redis-util.service';
import { UtilModule } from '../util/util.module';
import { PackageBuildEntity } from './entity/package-build.entity';
import { IntentionEntity } from '../intention/entity/intention.entity';
import { BrokerAccountEntity } from './entity/broker-account.entity';
import { CollectionConfigEntity } from './entity/collection-config.entity';
import { ConnectionConfigEntity } from './entity/connection-config.entity';
import { CollectionWatchEntity } from './entity/collection-watch.entity';
import { CollectionWatchConfigEntity } from './entity/collection-watch-config.entity';
import { EdgeEntity } from './entity/edge.entity';
import { EnvironmentEntity } from './entity/environment.entity';
import { JwtAllowEntity } from './entity/jwt-allow.entity';
import { JwtBlockEntity } from './entity/jwt-block.entity';
import { JwtRegistryEntity } from './entity/jwt-registry.entity';
import { PreferenceEntity } from './entity/preference.entity';
import { ProjectEntity } from './entity/project.entity';
import { ServerEntity } from './entity/server.entity';
import { ServiceInstanceEntity } from './entity/service-instance.entity';
import { ServiceEntity } from './entity/service.entity';
import { TeamEntity } from './entity/team.entity';
import { UserEntity } from './entity/user.entity';
import { VertexEntity } from './entity/vertex.entity';
import { GraphPermissionEntity } from './entity/graph-permission.entity';
import { UserAliasRequestEntity } from './entity/user-alias-request.entity';
import { RepositoryEntity } from './entity/repository.entity';

const redisFactory = {
  provide: 'REDIS_CLIENT',
  useFactory: async () => {
    const host = process.env.REDIS_HOST ? process.env.REDIS_HOST : 'localhost';
    const replics = process.env.REDIS_REPLICAS;
    const port = process.env.REDIS_PORT ? process.env.REDIS_PORT : '6379';
    const username = process.env.REDIS_USER ? process.env.REDIS_USER : '';
    const password = process.env.REDIS_PASSWORD
      ? `:${process.env.REDIS_PASSWORD}`
      : '';
    const url = `redis://${username}${password}${
      username.length > 0 || password.length > 0 ? '@' : ''
    }${host}:${port}`;
    const client = replics
      ? createCluster({
          rootNodes: [{ url }],
          useReplicas: true,
        })
      : createClient({ url });
    client.on('error', (err) => {
      logger.error('Redis client error');
      logger.error(err);
    });
    await client.connect();
    logger.log('Redis client connected');
    return client;
  },
};

/**
 * The persistence module provides interfaces to store, retrieve and query data.
 */
@Module({
  imports: [
    MikroOrmModule.forFeature([
      BrokerAccountEntity,
      CollectionConfigEntity,
      CollectionWatchEntity,
      CollectionWatchConfigEntity,
      ConnectionConfigEntity,
      EdgeEntity,
      EnvironmentEntity,
      GraphPermissionEntity,
      IntentionEntity,
      JwtAllowEntity,
      JwtBlockEntity,
      JwtRegistryEntity,
      ServiceEntity,
      ServiceInstanceEntity,
      PackageBuildEntity,
      PreferenceEntity,
      ProjectEntity,
      RepositoryEntity,
      ServerEntity,
      TeamEntity,
      UserAliasRequestEntity,
      UserEntity,
      VertexEntity,
    ]),
    UtilModule,
  ],
  providers: [
    BuildMongoRepository,
    {
      provide: BuildRepository,
      useExisting: BuildMongoRepository,
    },
    CollectionMongoRepository,
    {
      provide: CollectionRepository,
      useExisting: CollectionMongoRepository,
    },
    GraphMongoRepository,
    GraphRedisRepository,
    {
      provide: GraphRepository,
      useExisting: GraphRedisRepository,
    },
    IntentionMongoRepository,
    { provide: IntentionRepository, useExisting: IntentionMongoRepository },
    PersistenceRedisUtilService,
    PersistenceUtilService,
    SystemMongoRepository,
    {
      provide: SystemRepository,
      useExisting: SystemMongoRepository,
    },
    redisFactory,
  ],
  exports: [
    BuildRepository,
    CollectionRepository,
    GraphRepository,
    IntentionRepository,
    PersistenceUtilService,
    SystemRepository,
    redisFactory,
  ],
})
export class PersistenceModule {}
const logger = new Logger(PersistenceModule.name);
