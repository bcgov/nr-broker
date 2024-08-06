import { DataSource, MongoRepository, ObjectId } from 'typeorm';
import { BrokerAccountDto } from '../dto/broker-account.dto';
import { EnvironmentDto } from '../dto/environment.dto';
import { ProjectDto } from '../dto/project.dto';
import { ServerDto } from '../dto/server.dto';
import { ServiceInstanceDto } from '../dto/service-instance.dto';
import { ServiceDto } from '../dto/service.dto';
import { UserDto } from '../dto/user.dto';
import { TeamDto } from '../dto/team.dto';
import { CollectionDtoUnion } from '../dto/collection-dto-union.type';

export function getMongoDbConnectionUrl() {
  return process.env.MONGODB_URL.replace(
    '{{username}}',
    process.env.MONGODB_USERNAME,
  ).replace('{{password}}', process.env.MONGODB_PASSWORD);
}

export function getRepositoryFromCollectionName<
  T extends keyof CollectionDtoUnion,
>(dataSource: DataSource, name: T): MongoRepository<CollectionDtoUnion[T]> {
  switch (name) {
    case 'brokerAccount':
      return dataSource.getMongoRepository(BrokerAccountDto) as MongoRepository<
        CollectionDtoUnion[T]
      >;
    case 'environment':
      return dataSource.getMongoRepository(EnvironmentDto) as MongoRepository<
        CollectionDtoUnion[T]
      >;
    case 'project':
      return dataSource.getMongoRepository(ProjectDto) as MongoRepository<
        CollectionDtoUnion[T]
      >;
    case 'server':
      return dataSource.getMongoRepository(ServerDto) as MongoRepository<
        CollectionDtoUnion[T]
      >;
    case 'serviceInstance':
      return dataSource.getMongoRepository(
        ServiceInstanceDto,
      ) as MongoRepository<CollectionDtoUnion[T]>;
    case 'service':
      return dataSource.getMongoRepository(ServiceDto) as MongoRepository<
        CollectionDtoUnion[T]
      >;
    case 'team':
      return dataSource.getMongoRepository(TeamDto) as MongoRepository<
        CollectionDtoUnion[T]
      >;
    case 'user':
      return dataSource.getMongoRepository(UserDto) as MongoRepository<
        CollectionDtoUnion[T]
      >;
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
