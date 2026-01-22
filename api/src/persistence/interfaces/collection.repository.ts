import { CollectionSearchResult } from '../../collection/dto/collection-search-result.dto';
import { CollectionDtoUnion } from '../dto/collection-dto-union.type';
import { CollectionConfigEntity } from '../entity/collection-config.entity';
import { CollectionWatchBaseDto, CollectionWatchIdentifierDto } from '../dto/collection-watch.dto';
import { UserBaseDto, UserDto } from '../dto/user.dto';
import {
  CollectionEntityUnion,
  CollectionNames,
} from '../entity/collection-entity-union.type';

export abstract class CollectionRepository {
  public abstract assignCollection(
    collection: CollectionNames,
    data: any,
  ): CollectionEntityUnion[typeof collection];

  public abstract getCollectionConfigs(): Promise<CollectionConfigEntity[]>;

  public abstract getCollectionConfigByName(
    collection: keyof CollectionEntityUnion,
  ): Promise<CollectionConfigEntity>;

  public abstract getCollectionById<T extends keyof CollectionEntityUnion>(
    type: T,
    id: string,
  ): Promise<CollectionEntityUnion[T] | null>;

  public abstract getCollectionTags<T extends keyof CollectionEntityUnion>(
    type: T,
  ): Promise<string[]>;

  public abstract getCollectionByVertexId<
    T extends keyof CollectionEntityUnion,
  >(type: T, id: string): Promise<CollectionEntityUnion[T] | null>;

  public abstract getCollectionByKeyValue<
    T extends keyof CollectionEntityUnion,
  >(
    type: T,
    key: keyof CollectionEntityUnion[T],
    value: string,
  ): Promise<CollectionEntityUnion[T] | null>;

  public abstract getCollection<T extends keyof CollectionEntityUnion>(
    type: T,
    whereClause: any,
  ): Promise<CollectionEntityUnion[T] | null>;
  // | ObjectLiteral
  // | FindOptionsWhere<CollectionEntityUnion[T]>
  // | FindOptionsWhere<CollectionEntityUnion[T]>[],

  public abstract getCollections<T extends keyof CollectionEntityUnion>(
    type: T,
  ): Promise<CollectionEntityUnion[T][]>;

  public abstract filterCollection<T extends keyof CollectionEntityUnion>(
    type: T,
    tags: string[] | undefined,
    upstreamVertex: string | undefined,
    downstreamVertex: string | undefined,
    includeRestricted: boolean | undefined,
    id: string | undefined,
    vertexIds: string[] | undefined,
    sort: string | undefined,
    dir: string | undefined,
    offset: number,
    limit: number,
  ): Promise<CollectionSearchResult<CollectionDtoUnion[T]>>;

  public abstract doUniqueKeyCheck(
    collection: keyof CollectionEntityUnion,
    key: string,
    value: string,
  ): Promise<string[]>;

  public abstract saveWatch(
    collection: keyof CollectionEntityUnion,
    id: string,
    watch: CollectionWatchBaseDto
  ): Promise<CollectionWatchBaseDto>;

  public abstract getWatchers(
    collection: keyof CollectionEntityUnion,
    id: string,
    watchIdentifier: CollectionWatchIdentifierDto,
  ): Promise<UserDto[]>;
  //): Promise<UserBaseDto[]>;

  public abstract saveTags(
    collection: keyof CollectionEntityUnion,
    id: string,
    tags: string[],
  ): Promise<string[]>;
}
