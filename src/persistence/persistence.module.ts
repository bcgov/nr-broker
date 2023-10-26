import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

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
    {
      provide: GraphRepository,
      useExisting: GraphMongoRepository,
    },
    IntentionMongoRepository,
    { provide: IntentionRepository, useExisting: IntentionMongoRepository },
    PersistenceUtilService,
    SystemMongoRepository,
    {
      provide: SystemRepository,
      useExisting: SystemMongoRepository,
    },
  ],
  exports: [
    CollectionRepository,
    GraphRepository,
    IntentionRepository,
    PersistenceUtilService,
    SystemRepository,
  ],
})
export class PersistenceModule {}
