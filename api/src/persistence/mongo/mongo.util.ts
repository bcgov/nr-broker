import { BrokerAccountEntity } from '../entity/broker-account.entity';
import { EnvironmentEntity } from '../entity/environment.entity';
import { ProjectEntity } from '../entity/project.entity';
import { ServerEntity } from '../entity/server.entity';
import { ServiceInstanceEntity } from '../entity/service-instance.entity';
import { ServiceEntity } from '../entity/service.entity';
import { UserEntity } from '../entity/user.entity';
import { TeamEntity } from '../entity/team.entity';
// import { CollectionWatchDto } from '../entity/collection-watch.embeddable';
import {
  MongoEntityManager,
  MongoEntityRepository,
  ObjectId,
} from '@mikro-orm/mongodb';
import { CollectionEntityUnion } from '../entity/collection-entity-union.type';
import { RepositoryEntity } from '../entity/repository.entity';

export function getMongoDbConnectionUrl() {
  return process.env.MONGODB_URL.replace(
    '{{username}}',
    process.env.MONGODB_USERNAME,
  ).replace('{{password}}', process.env.MONGODB_PASSWORD);
}

export function getRepositoryFromCollectionName<
  T extends keyof CollectionEntityUnion,
>(
  dataSource: MongoEntityManager,
  name: T,
): MongoEntityRepository<CollectionEntityUnion[T]> {
  switch (name) {
    case 'brokerAccount':
      return dataSource.getRepository(
        BrokerAccountEntity,
      ) as unknown as MongoEntityRepository<CollectionEntityUnion[T]>;
    case 'environment':
      return dataSource.getRepository(
        EnvironmentEntity,
      ) as unknown as MongoEntityRepository<CollectionEntityUnion[T]>;
    case 'project':
      return dataSource.getRepository(
        ProjectEntity,
      ) as unknown as MongoEntityRepository<CollectionEntityUnion[T]>;
    case 'repository':
      return dataSource.getRepository(
        RepositoryEntity,
      ) as unknown as MongoEntityRepository<CollectionEntityUnion[T]>;
    case 'server':
      return dataSource.getRepository(
        ServerEntity,
      ) as unknown as MongoEntityRepository<CollectionEntityUnion[T]>;
    case 'serviceInstance':
      return dataSource.getRepository(
        ServiceInstanceEntity,
      ) as unknown as MongoEntityRepository<CollectionEntityUnion[T]>;
    case 'service':
      return dataSource.getRepository(
        ServiceEntity,
      ) as unknown as MongoEntityRepository<CollectionEntityUnion[T]>;
    case 'team':
      return dataSource.getRepository(
        TeamEntity,
      ) as unknown as MongoEntityRepository<CollectionEntityUnion[T]>;
    case 'user':
      return dataSource.getRepository(
        UserEntity,
      ) as unknown as MongoEntityRepository<CollectionEntityUnion[T]>;
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
