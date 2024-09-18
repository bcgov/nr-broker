import { BrokerAccountRestDto } from './broker-account-rest.dto';
import { EnvironmentRestDto } from './environment-rest.dto';
import { ProjectRestDto } from './project-rest.dto';
import { ServiceInstanceRestDto } from './service-instance-rest.dto';
import { ServiceRestDto } from './service-rest.dto';
import { TeamRestDto } from './team-rest.dto';
import { UserRestDto } from './user-rest.dto';

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

export type CollectionNames = keyof CollectionDtoRestUnion;

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
