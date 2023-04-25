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
import { JwtValidationRepository } from './interfaces/jwt-validation.reposity';
import { GraphMongoRepository } from './mongo/graph-mongo.repository';
import { IntentionMongoRepository } from './mongo/intention-mongo.repository';
import { JwtValidationMongoRepository } from './mongo/jwt-validation-mongo.repository';
import { CollectionConfigDto } from './dto/collection-config.dto';
import { CollectionMongoRepository } from './mongo/collection-mongo.repository';
import { CollectionRepository } from './interfaces/collection.repository';
import { UserDto } from './dto/user.dto';

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
    JwtValidationMongoRepository,
    {
      provide: JwtValidationRepository,
      useExisting: JwtValidationMongoRepository,
    },
  ],
  exports: [
    CollectionRepository,
    GraphRepository,
    IntentionRepository,
    JwtValidationRepository,
  ],
})
export class PersistenceModule {}
