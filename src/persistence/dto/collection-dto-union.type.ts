import { BrokerAccountRestDto } from './broker-account-rest.dto';
import { BrokerAccountDto } from './broker-account.dto';
import { EnvironmentRestDto } from './environment-rest.dto';
import { EnvironmentDto } from './environment.dto';
import { ProjectRestDto } from './project-rest.dto';
import { ProjectDto } from './project.dto';
import { ServerDto } from './server.dto';
import { ServiceInstanceRestDto } from './service-instance-rest.dto';
import { ServiceInstanceDto } from './service-instance.dto';
import { ServiceRestDto } from './service-rest.dto';
import { ServiceDto } from './service.dto';
import { TeamRestDto } from './team-rest.dto';
import { TeamDto } from './team.dto';
import { UserRestDto } from './user-rest.dto';
import { UserDto } from './user.dto';

export type CollectionDtoUnion = {
  brokerAccount: BrokerAccountDto;
  environment: EnvironmentDto;
  project: ProjectDto;
  server: ServerDto;
  serviceInstance: ServiceInstanceDto;
  service: ServiceDto;
  team: TeamDto;
  user: UserDto;
};

export type CollectionDtoRestUnion = {
  brokerAccount: BrokerAccountRestDto;
  environment: EnvironmentRestDto;
  project: ProjectRestDto;
  server: ServerDto;
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
