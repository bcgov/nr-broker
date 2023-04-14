import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { CollectionConfigRepository } from '../interfaces/collection-config.repository';
import { CollectionConfigDto } from '../dto/collection-config.dto';

@Injectable()
export class CollectionConfigMongoRepository
  implements CollectionConfigRepository
{
  constructor(
    @InjectRepository(CollectionConfigDto)
    private collectionConfigRepository: MongoRepository<CollectionConfigDto>,
  ) {}

  public getAll(): Promise<CollectionConfigDto[]> {
    return this.collectionConfigRepository.find({});
  }

  public async getCollectionConfigByname(
    collection: string,
  ): Promise<CollectionConfigDto> {
    return this.collectionConfigRepository.findOne({
      where: { collection } as any,
    });
  }
}
