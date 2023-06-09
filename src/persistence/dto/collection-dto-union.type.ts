import { AccountDto } from '../dto/account.dto';
import { EnvironmentDto } from '../dto/environment.dto';
import { ProjectDto } from '../dto/project.dto';
import { ServiceInstanceDto } from '../dto/service-instance.dto';
import { ServiceDto } from '../dto/service.dto';
import { UserDto } from '../dto/user.dto';

export type CollectionDtoUnion = {
  account: AccountDto;
  environment: EnvironmentDto;
  project: ProjectDto;
  serviceInstance: ServiceInstanceDto;
  service: ServiceDto;
  user: UserDto;
};
