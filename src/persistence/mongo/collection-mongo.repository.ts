import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { CollectionRepository } from '../interfaces/collection.repository';
import { CollectionDtoUnion } from '../dto/collection-dto-union.type';
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

  public async getCollectionById<T extends keyof CollectionDtoUnion>(
    type: T,
    id: string,
  ): Promise<CollectionDtoUnion[T] | null> {
    const repo = getRepositoryFromCollectionName(this.dataSource, type);
    return repo.findOne({
      where: { _id: new ObjectId(id) } as any,
    });
  }

  public async getCollectionByVertexId<T extends keyof CollectionDtoUnion>(
    type: T,
    id: string,
  ): Promise<CollectionDtoUnion[T] | null> {
    const repo = getRepositoryFromCollectionName(this.dataSource, type);
    return repo.findOne({
      where: { vertex: new ObjectId(id) } as any,
    });
  }

  public async getCollectionByKeyValue<T extends keyof CollectionDtoUnion>(
    type: T,
    key: string,
    value: string,
  ): Promise<CollectionDtoUnion[T] | null> {
    const repo = getRepositoryFromCollectionName(this.dataSource, type);
    return repo.findOne({
      where: { [key]: value } as any,
    });
  }
}
