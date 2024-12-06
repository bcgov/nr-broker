import { BrokerAccountDto } from './broker-account.dto';
import { EnvironmentDto } from './environment.dto';
import { ProjectDto } from './project.dto';
import { ServiceInstanceDto } from './service-instance.dto';
import { ServiceDto } from './service.dto';
import { TeamDto } from './team.dto';
import { UserDto } from './user.dto';

export type CollectionDtoUnion = {
  brokerAccount: BrokerAccountDto;
  environment: EnvironmentDto;
  project: ProjectDto;
  server: ServiceDto;
  serviceInstance: ServiceInstanceDto;
  service: ServiceDto;
  team: TeamDto;
  user: UserDto;
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
