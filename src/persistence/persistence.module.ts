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
import { PackageBuildEntity } from './dto/package-build.entity';
import { IntentionEntity } from 'src/intention/dto/intention.entity';
import { BrokerAccountEntity } from './dto/broker-account.entity';
import { CollectionConfigEntity } from './dto/collection-config.entity';
import { ConnectionConfigEntity } from './dto/connection-config.entity';
import { EdgeEntity } from './dto/edge.entity';
import { EnvironmentEntity } from './dto/environment.entity';
import { JwtAllowEntity } from './dto/jwt-allow.dto';
import { JwtBlockEntity } from './dto/jwt-block.dto';
import { JwtRegistryEntity } from './dto/jwt-registry.entity';
import { PreferenceEntity } from './dto/preference.entity';
import { ProjectEntity } from './dto/project.entity';
import { ServerEntity } from './dto/server.entity';
import { ServiceInstanceEntity } from './dto/service-instance.entity';
import { ServiceEntity } from './dto/service.entity';
import { TeamEntity } from './dto/team.entity';
import { UserEntity } from './dto/user.entity';
import { VertexEntity } from './dto/vertex.entity';
import { GraphPermissionEntity } from './dto/graph-permission.entity';
import { UserAliasRequestEntity } from './dto/user-alias-request.entity';

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
