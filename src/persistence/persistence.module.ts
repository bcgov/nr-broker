import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createClient, createCluster } from 'redis';

import { BrokerAccountDto } from './dto/broker-account.dto';
import { CollectionConfigDto } from './dto/collection-config.dto';
import { EdgeDto } from './dto/edge.dto';
import { EnvironmentDto } from './dto/environment.dto';
import { IntentionDto } from '../intention/dto/intention.dto';
import { JwtAllowDto } from './dto/jwt-allow.dto';
import { JwtBlockDto } from './dto/jwt-block.dto';
import { JwtRegistryDto } from './dto/jwt-registry.dto';
import { PreferenceDto } from './dto/preference.dto';
import { ProjectDto } from './dto/project.dto';
import { ServerDto } from './dto/server.dto';
import { ServiceDto } from './dto/service.dto';
import { ServiceInstanceDto } from './dto/service-instance.dto';
import { TeamDto } from './dto/team.dto';
import { UserDto } from './dto/user.dto';
import { VertexDto } from './dto/vertex.dto';

import { GraphRepository } from './interfaces/graph.repository';
import { IntentionRepository } from './interfaces/intention.repository';
import { GraphMongoRepository } from './mongo/graph-mongo.repository';
import { IntentionMongoRepository } from './mongo/intention-mongo.repository';
import { CollectionMongoRepository } from './mongo/collection-mongo.repository';
import { CollectionRepository } from './interfaces/collection.repository';
import { SystemMongoRepository } from './mongo/system-mongo.repository';
import { SystemRepository } from './interfaces/system.repository';
import { PersistenceUtilService } from './persistence-util.service';
import { GraphRedisRepository } from './redis-composition/graph-redis.repository';
import { PersistenceRedisUtilService } from './persistence-redis-util.service';

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
    TypeOrmModule.forFeature([
      BrokerAccountDto,
      CollectionConfigDto,
      EdgeDto,
      EnvironmentDto,
      IntentionDto,
      JwtAllowDto,
      JwtBlockDto,
      JwtRegistryDto,
      ServiceDto,
      ServiceInstanceDto,
      PreferenceDto,
      ProjectDto,
      ServerDto,
      TeamDto,
      UserDto,
      VertexDto,
    ]),
  ],
  providers: [
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
