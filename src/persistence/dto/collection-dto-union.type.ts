import { BrokerAccountDto } from './broker-account.dto';
import { EnvironmentDto } from '../dto/environment.dto';
import { ProjectDto } from '../dto/project.dto';
import { ServiceInstanceDto } from '../dto/service-instance.dto';
import { ServiceDto } from '../dto/service.dto';
import { TeamDto } from './team.dto';
import { UserDto } from '../dto/user.dto';

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
