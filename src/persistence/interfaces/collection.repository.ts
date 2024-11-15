import { CollectionSearchResult } from '../../collection/dto/collection-search-result.dto';
import { CollectionConfigEntity } from '../dto/collection-config.entity';
import {
  CollectionDtoUnion,
  CollectionNames,
} from '../dto/collection-dto-union.type';

export abstract class CollectionRepository {
  public abstract assignCollection(
    collection: CollectionNames,
    data: any,
  ): CollectionDtoUnion[typeof collection];

  public abstract getCollectionConfigs(): Promise<CollectionConfigEntity[]>;

  public abstract getCollectionConfigByName(
    collection: keyof CollectionDtoUnion,
  ): Promise<CollectionConfigEntity>;

  public abstract getCollectionById<T extends keyof CollectionDtoUnion>(
    type: T,
    id: string,
  ): Promise<CollectionDtoUnion[T] | null>;

  public abstract getCollectionTags<T extends keyof CollectionDtoUnion>(
    type: T,
  ): Promise<string[]>;

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
    whereClause: any,
  ): Promise<CollectionDtoUnion[T] | null>;
  // | ObjectLiteral
  // | FindOptionsWhere<CollectionDtoUnion[T]>
  // | FindOptionsWhere<CollectionDtoUnion[T]>[],

  public abstract getCollections<T extends keyof CollectionDtoUnion>(
    type: T,
  ): Promise<CollectionDtoUnion[T][]>;

  public abstract searchCollection<T extends keyof CollectionDtoUnion>(
    type: T,
    tags: string[] | undefined,
    upstreamVertex: string | undefined,
    downstreamVertex: string | undefined,
    id: string | undefined,
    vertexIds: string[] | undefined,
    sort: string | undefined,
    dir: string | undefined,
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
