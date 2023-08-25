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
    key: string,
    value: string,
  ): Promise<CollectionDtoUnion[T] | null>;

  public abstract getCollections<T extends keyof CollectionDtoUnion>(
    type: T,
  ): Promise<CollectionDtoUnion[T][]>;

  public abstract searchCollection<T extends keyof CollectionDtoUnion>(
    type: T,
    upstreamVertex: string | undefined,
    vertexId: string | undefined,
    offset: number,
    limit: number,
  ): Promise<CollectionSearchResult<CollectionDtoUnion[T]>>;
}
