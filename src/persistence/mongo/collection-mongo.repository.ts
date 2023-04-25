import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { CollectionRepository } from '../interfaces/collection.repository';
import { CollectionConfigDto } from '../dto/collection-config.dto';
import { EnvironmentDto } from '../dto/environment.dto';
import { ProjectDto } from '../dto/project.dto';
import { ServiceInstanceDto } from '../dto/service-instance.dto';
import { ServiceDto } from '../dto/service.dto';

@Injectable()
export class CollectionMongoRepository implements CollectionRepository {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(CollectionConfigDto)
    private collectionConfigRepository: MongoRepository<CollectionConfigDto>,
  ) {}

  public getCollectionConfigs(): Promise<CollectionConfigDto[]> {
    return this.collectionConfigRepository.find({});
  }

  public async getCollectionConfigByname(
    collection: string,
  ): Promise<CollectionConfigDto> {
    return this.collectionConfigRepository.findOne({
      where: { collection } as any,
    });
  }

  public async getCollectionByVertexId(type: string, id: string): Promise<any> {
    const repo = this.getRepositoryFromCollectionName(type);
    return repo.findOne({
      where: { vertex: new ObjectId(id) } as any,
    });
  }

  private getRepositoryFromCollectionName(name: string): MongoRepository<any> {
    switch (name) {
      case 'environment':
        return this.dataSource.getMongoRepository(EnvironmentDto);
      case 'project':
        return this.dataSource.getMongoRepository(ProjectDto);
      case 'serviceInstance':
        return this.dataSource.getMongoRepository(ServiceInstanceDto);
      case 'service':
        return this.dataSource.getMongoRepository(ServiceDto);
      default:
        throw Error();
    }
  }
}
