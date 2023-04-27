import { DataSource, MongoRepository, ObjectId } from 'typeorm';
import { EnvironmentDto } from '../dto/environment.dto';
import { ProjectDto } from '../dto/project.dto';
import { ServiceInstanceDto } from '../dto/service-instance.dto';
import { ServiceDto } from '../dto/service.dto';
import { UserDto } from '../dto/user.dto';

export function getMongoDbConnectionUrl() {
  return process.env.MONGODB_URL.replace(
    '{{username}}',
    process.env.MONGODB_USERNAME,
  ).replace('{{password}}', process.env.MONGODB_PASSWORD);
}

export function getRepositoryFromCollectionName(
  dataSource: DataSource,
  name: string,
): MongoRepository<any> {
  switch (name) {
    case 'environment':
      return dataSource.getMongoRepository(EnvironmentDto);
    case 'project':
      return dataSource.getMongoRepository(ProjectDto);
    case 'serviceInstance':
      return dataSource.getMongoRepository(ServiceInstanceDto);
    case 'service':
      return dataSource.getMongoRepository(ServiceDto);
    case 'user':
      return dataSource.getMongoRepository(UserDto);
    default:
      throw Error();
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
