import { BrokerAccountEntity } from '../dto/broker-account.entity';
import { EnvironmentEntity } from '../dto/environment.entity';
import { ProjectEntity } from '../dto/project.entity';
import { ServerEntity } from '../dto/server.entity';
import { ServiceInstanceEntity } from '../dto/service-instance.entity';
import { ServiceEntity } from '../dto/service.entity';
import { UserEntity } from '../dto/user.entity';
import { TeamEntity } from '../dto/team.entity';
import { CollectionDtoUnion } from '../dto/collection-dto-union.type';
import {
  MongoEntityManager,
  MongoEntityRepository,
  ObjectId,
} from '@mikro-orm/mongodb';

export function getMongoDbConnectionUrl() {
  return process.env.MONGODB_URL.replace(
    '{{username}}',
    process.env.MONGODB_USERNAME,
  ).replace('{{password}}', process.env.MONGODB_PASSWORD);
}

export function getRepositoryFromCollectionName<
  T extends keyof CollectionDtoUnion,
>(
  dataSource: MongoEntityManager,
  name: T,
): MongoEntityRepository<CollectionDtoUnion[T]> {
  switch (name) {
    case 'brokerAccount':
      return dataSource.getRepository(
        BrokerAccountEntity,
      ) as unknown as MongoEntityRepository<CollectionDtoUnion[T]>;
    case 'environment':
      return dataSource.getRepository(
        EnvironmentEntity,
      ) as unknown as MongoEntityRepository<CollectionDtoUnion[T]>;
    case 'project':
      return dataSource.getRepository(
        ProjectEntity,
      ) as unknown as MongoEntityRepository<CollectionDtoUnion[T]>;
    case 'server':
      return dataSource.getRepository(
        ServerEntity,
      ) as unknown as MongoEntityRepository<CollectionDtoUnion[T]>;
    case 'serviceInstance':
      return dataSource.getRepository(
        ServiceInstanceEntity,
      ) as unknown as MongoEntityRepository<CollectionDtoUnion[T]>;
    case 'service':
      return dataSource.getRepository(
        ServiceEntity,
      ) as unknown as MongoEntityRepository<CollectionDtoUnion[T]>;
    case 'team':
      return dataSource.getRepository(
        TeamEntity,
      ) as unknown as MongoEntityRepository<CollectionDtoUnion[T]>;
    case 'user':
      return dataSource.getRepository(
        UserEntity,
      ) as unknown as MongoEntityRepository<CollectionDtoUnion[T]>;
    default:
      // If this is an error then not all collection types are above
      // eslint-disable-next-line no-case-declarations
      const _exhaustiveCheck: never = name;
      return _exhaustiveCheck;
  }
}

/**
 * Shim to remove the id key from the object so that mongodb doesn't end up with
 * duplicate _id and id when replacing
 * @param obj The object to extract the id from
 * @returns The ObjectId
 */
export function extractId(obj: any): ObjectId {
  const id = obj.id;
  delete obj.id;
  return id;
}

export function arrayIdFixer(array: any[]) {
  if (!Array.isArray(array)) {
    return;
  }
  for (const item of array) {
    item.id = item._id;
    delete item._id;
  }
}
