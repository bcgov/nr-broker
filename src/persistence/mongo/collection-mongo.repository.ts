import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { CollectionRepository } from '../interfaces/collection.repository';
import { CollectionConfigDto } from '../dto/collection-config.dto';
import { getRepositoryFromCollectionName } from './mongo.util';

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
    const repo = getRepositoryFromCollectionName(this.dataSource, type);
    return repo.findOne({
      where: { vertex: new ObjectId(id) } as any,
    });
  }

  public async getCollectionByKeyValue(
    type: string,
    key: string,
    value: string,
  ): Promise<any> {
    const repo = getRepositoryFromCollectionName(this.dataSource, type);
    return repo.findOne({
      where: { [key]: value } as any,
    });
  }
}
