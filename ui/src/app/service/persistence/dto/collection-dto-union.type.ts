import { BrokerAccountBaseDto, BrokerAccountDto } from './broker-account.dto';
import { EnvironmentBaseDto, EnvironmentDto } from './environment.dto';
import { ProjectBaseDto, ProjectDto } from './project.dto';
import { ServerBaseDto, ServerDto } from './server.dto';
import {
  ServiceInstanceBaseDto,
  ServiceInstanceDto,
} from './service-instance.dto';
import { ServiceBaseDto, ServiceDto } from './service.dto';
import { TeamBaseDto, TeamDto } from './team.dto';
import { UserBaseDto, UserDto } from './user.dto';

export const CollectionBaseDtoUnionObject = {
  brokerAccount: BrokerAccountBaseDto,
  environment: EnvironmentBaseDto,
  project: ProjectBaseDto,
  server: ServerBaseDto,
  serviceInstance: ServiceInstanceBaseDto,
  service: ServiceBaseDto,
  team: TeamBaseDto,
  user: UserBaseDto,
};
export const CollectionDtoUnionObject = {
  brokerAccount: BrokerAccountDto,
  environment: EnvironmentDto,
  project: ProjectDto,
  server: ServerDto,
  serviceInstance: ServiceInstanceDto,
  service: ServiceDto,
  team: TeamDto,
  user: UserDto,
};
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

export const CollectionBaseSubTypes = Object.entries(
  CollectionBaseDtoUnionObject,
).map(([key, value]) => ({
  name: key,
  value: value,
}));

export type CollectionNames = keyof CollectionDtoUnion;
export type CollectionValues = CollectionDtoUnion[CollectionNames];

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
