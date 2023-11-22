import { BrokerAccountRestDto } from './broker-account-rest.dto';
import { EnvironmentRestDto } from './environment-rest.dto';
import { ProjectRestDto } from './project-rest.dto';
import { ServiceInstanceRestDto } from './service-instance-rest.dto';
import { ServiceRestDto } from './service-rest.dto';
import { TeamRestDto } from './team-rest.dto';
import { UserRestDto } from './user-rest.dto';

export type CollectionDtoUnion = {
  brokerAccount: BrokerAccountRestDto;
  environment: EnvironmentRestDto;
  project: ProjectRestDto;
  serviceInstance: ServiceInstanceRestDto;
  service: ServiceRestDto;
  team: TeamRestDto;
  user: UserRestDto;
};

export type CollectionNames = keyof CollectionDtoUnion;
