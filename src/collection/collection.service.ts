import { Injectable, NotFoundException } from '@nestjs/common';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { CollectionConfigDto } from '../persistence/dto/collection-config.dto';

@Injectable()
export class CollectionService {
  constructor(private readonly collectionRepository: CollectionRepository) {}

  public async getCollectionConfig(): Promise<CollectionConfigDto[]> {
    return this.collectionRepository.getCollectionConfigs();
  }

  async getCollectionByVertexId(type: string, id: string) {
    try {
      return this.collectionRepository.getCollectionByVertexId(type, id);
    } catch (error) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
  }
}
