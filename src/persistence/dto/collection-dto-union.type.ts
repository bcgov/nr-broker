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
  serviceInstance: ServiceInstanceDto;
  service: ServiceDto;
  team: TeamDto;
  user: UserDto;
};

export type CollectionNames = keyof CollectionDtoUnion;
