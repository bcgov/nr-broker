import { BrokerAccountEntity } from './broker-account.entity';
import { EnvironmentEntity } from './environment.entity';
import { ProjectEntity } from './project.entity';
import { ServerEntity } from './server.entity';
import { ServiceInstanceEntity } from './service-instance.entity';
import { ServiceEntity } from './service.entity';
import { TeamEntity } from './team.entity';
import { UserEntity } from './user.entity';

export type CollectionEntityUnion = {
  brokerAccount: BrokerAccountEntity;
  environment: EnvironmentEntity;
  project: ProjectEntity;
  server: ServerEntity;
  serviceInstance: ServiceInstanceEntity;
  service: ServiceEntity;
  team: TeamEntity;
  user: UserEntity;
};

export type CollectionNames = keyof CollectionEntityUnion;

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
