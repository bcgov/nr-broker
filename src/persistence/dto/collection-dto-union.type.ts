import { BrokerAccountRestDto } from './broker-account-rest.dto';
import { BrokerAccountEntity } from './broker-account.entity';
import { EnvironmentRestDto } from './environment-rest.dto';
import { EnvironmentEntity } from './environment.entity';
import { ProjectRestDto } from './project-rest.dto';
import { ProjectEntity } from './project.entity';
import { ServerEntity } from './server.entity';
import { ServiceInstanceRestDto } from './service-instance-rest.dto';
import { ServiceInstanceEntity } from './service-instance.entity';
import { ServiceRestDto } from './service-rest.dto';
import { ServiceEntity } from './service.entity';
import { TeamRestDto } from './team-rest.dto';
import { TeamEntity } from './team.entity';
import { UserRestDto } from './user-rest.dto';
import { UserEntity } from './user.entity';

export type CollectionDtoUnion = {
  brokerAccount: BrokerAccountEntity;
  environment: EnvironmentEntity;
  project: ProjectEntity;
  server: ServerEntity;
  serviceInstance: ServiceInstanceEntity;
  service: ServiceEntity;
  team: TeamEntity;
  user: UserEntity;
};

export type CollectionDtoRestUnion = {
  brokerAccount: BrokerAccountRestDto;
  environment: EnvironmentRestDto;
  project: ProjectRestDto;
  server: ServiceRestDto;
  serviceInstance: ServiceInstanceRestDto;
  service: ServiceRestDto;
  team: TeamRestDto;
  user: UserRestDto;
};

export type CollectionNames = keyof CollectionDtoUnion;

export const CollectionNameEnum: {
  [Property in CollectionNames]: number;
} = {
  environment: 0,
  project: 1,
  service: 2,
  serviceInstance: 3,
  user: 4,
  brokerAccount: 5,
  team: 6,
  server: 7,
} as const;
