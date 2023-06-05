import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntentionDto } from '../intention/dto/intention.dto';
import { EdgeDto } from './dto/edge.dto';
import { EnvironmentDto } from './dto/environment.dto';
import { JwtAllowDto } from './dto/jwt-allow.dto';
import { JwtBlockDto } from './dto/jwt-block.dto';
import { ProjectDto } from './dto/project.dto';
import { ServiceInstanceDto } from './dto/service-instance.dto';
import { ServiceDto } from './dto/service.dto';
import { VertexDto } from './dto/vertex.dto';
import { GraphRepository } from './interfaces/graph.repository';
import { IntentionRepository } from './interfaces/intention.repository';
import { GraphMongoRepository } from './mongo/graph-mongo.repository';
import { IntentionMongoRepository } from './mongo/intention-mongo.repository';
import { CollectionConfigDto } from './dto/collection-config.dto';
import { CollectionMongoRepository } from './mongo/collection-mongo.repository';
import { CollectionRepository } from './interfaces/collection.repository';
import { UserDto } from './dto/user.dto';
import { PreferenceDto } from './dto/preference.dto';
import { SystemMongoRepository } from './mongo/system-mongo.repository';
import { SystemRepository } from './interfaces/system.repository';
import { IntentionSyncService } from './intention-sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CollectionConfigDto,
      EdgeDto,
      EnvironmentDto,
      IntentionDto,
      JwtAllowDto,
      JwtBlockDto,
      ServiceDto,
      ServiceInstanceDto,
      PreferenceDto,
      ProjectDto,
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
    IntentionSyncService,
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
    IntentionSyncService,
    SystemRepository,
  ],
})
export class PersistenceModule {}
