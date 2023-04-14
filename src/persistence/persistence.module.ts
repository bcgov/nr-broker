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
import { EnvironmentRepository } from './interfaces/environment.repository';
import { GraphRepository } from './interfaces/graph.repository';
import { IntentionRepository } from './interfaces/intention.repository';
import { JwtValidationRepository } from './interfaces/jwt-validation.reposity';
import { ProjectRepository } from './interfaces/project.repository';
import { ServiceInstanceRepository } from './interfaces/service-instance.repository';
import { ServiceRepository } from './interfaces/service.repository';
import { EnvironmentMongoRepository } from './mongo/environment-mongo.repository';
import { GraphMongoRepository } from './mongo/graph-mongo.repository';
import { IntentionMongoRepository } from './mongo/intention-mongo.repository';
import { JwtValidationMongoRepository } from './mongo/jwt-validation-mongo.repository';
import { ProjectMongoRepository } from './mongo/project-mongo.repository';
import { ServiceInstanceMongoRepository } from './mongo/service-instance-mongo.repository';
import { ServiceMongoRepository } from './mongo/service-mongo.repository';
import { CollectionConfigDto } from './dto/collection-config.dto';
import { CollectionConfigMongoRepository } from './mongo/collection-config-mongo.repository';
import { CollectionConfigRepository } from './interfaces/collection-config.repository';

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
      VertexDto,
    ]),
  ],
  providers: [
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
    ProjectMongoRepository,
    {
      provide: ProjectRepository,
      useExisting: ProjectMongoRepository,
    },
    EnvironmentMongoRepository,
    {
      provide: EnvironmentRepository,
      useExisting: EnvironmentMongoRepository,
    },
    CollectionConfigMongoRepository,
    {
      provide: CollectionConfigRepository,
      useExisting: CollectionConfigMongoRepository,
    },
    ServiceMongoRepository,
    {
      provide: ServiceRepository,
      useExisting: ServiceMongoRepository,
    },
    ServiceInstanceMongoRepository,
    {
      provide: ServiceInstanceRepository,
      useExisting: ServiceInstanceMongoRepository,
    },
  ],
  exports: [
    CollectionConfigRepository,
    GraphRepository,
    IntentionRepository,
    JwtValidationRepository,
    EnvironmentRepository,
    ProjectRepository,
    ServiceRepository,
    ServiceInstanceRepository,
  ],
})
export class PersistenceModule {}
