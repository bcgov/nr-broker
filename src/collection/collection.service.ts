import { Injectable, NotFoundException } from '@nestjs/common';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { CollectionConfigDto } from '../persistence/dto/collection-config.dto';
import { CollectionDtoUnion } from '../persistence/dto/collection-dto-union.type';

@Injectable()
export class CollectionService {
  constructor(private readonly collectionRepository: CollectionRepository) {}

  public async getCollectionConfig(): Promise<CollectionConfigDto[]> {
    return this.collectionRepository.getCollectionConfigs();
  }

  public async getCollectionConfigByName(
    collection: keyof CollectionDtoUnion,
  ): Promise<CollectionConfigDto | null> {
    return this.collectionRepository.getCollectionConfigByName(collection);
  }

  async getCollectionByVertexId<T extends keyof CollectionDtoUnion>(
    type: T,
    vertexId: string,
  ) {
    try {
      return this.collectionRepository.getCollectionByVertexId(type, vertexId);
    } catch (error) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
  }

  async searchCollection<T extends keyof CollectionDtoUnion>(
    type: T,
    upstreamVertex: string | undefined,
    vertexId: string | undefined,
    offset: number,
    limit: number,
  ) {
    return this.collectionRepository.searchCollection(
      type,
      upstreamVertex,
      vertexId,
      offset,
      limit,
    );
  }
}
