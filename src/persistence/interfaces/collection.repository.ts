import { ObjectLiteral, FindOptionsWhere } from 'typeorm';
import { CollectionSearchResult } from '../../collection/dto/collection-search-result.dto';
import { CollectionConfigDto } from '../dto/collection-config.dto';
import { CollectionDtoUnion } from '../dto/collection-dto-union.type';

export abstract class CollectionRepository {
  public abstract getCollectionConfigs(): Promise<CollectionConfigDto[]>;

  public abstract getCollectionConfigByName(
    collection: keyof CollectionDtoUnion,
  ): Promise<CollectionConfigDto>;

  public abstract getCollectionById<T extends keyof CollectionDtoUnion>(
    type: T,
    id: string,
  ): Promise<CollectionDtoUnion[T] | null>;

  public abstract getCollectionByVertexId<T extends keyof CollectionDtoUnion>(
    type: T,
    id: string,
  ): Promise<CollectionDtoUnion[T] | null>;

  public abstract getCollectionByKeyValue<T extends keyof CollectionDtoUnion>(
    type: T,
    key: keyof CollectionDtoUnion[T],
    value: string,
  ): Promise<CollectionDtoUnion[T] | null>;

  public abstract getCollection<T extends keyof CollectionDtoUnion>(
    type: T,
    whereClause:
      | ObjectLiteral
      | FindOptionsWhere<CollectionDtoUnion[T]>
      | FindOptionsWhere<CollectionDtoUnion[T]>[],
  ): Promise<CollectionDtoUnion[T] | null>;

  public abstract getCollections<T extends keyof CollectionDtoUnion>(
    type: T,
  ): Promise<CollectionDtoUnion[T][]>;

  public abstract searchCollection<T extends keyof CollectionDtoUnion>(
    type: T,
    upstreamVertex: string | undefined,
    id: string | undefined,
    vertexIds: string[] | undefined,
    offset: number,
    limit: number,
  ): Promise<CollectionSearchResult<CollectionDtoUnion[T]>>;

  public abstract exportCollection<T extends keyof CollectionDtoUnion>(
    type: T,
  ): Promise<CollectionDtoUnion[T][]>;

  public abstract doUniqueKeyCheck(
    collection: keyof CollectionDtoUnion,
    key: string,
    value: string,
  ): Promise<string[]>;

  public abstract saveTags(
    collection: keyof CollectionDtoUnion,
    id: string,
    tags: string[],
  ): Promise<string[]>;
}
