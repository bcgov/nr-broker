import { Injectable } from '@nestjs/common';
import { wrap } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  MongoEntityManager,
  MongoEntityRepository,
  ObjectId,
} from '@mikro-orm/mongodb';
import { CollectionRepository } from '../interfaces/collection.repository';
import { CollectionConfigEntity } from '../entity/collection-config.entity';
import { getRepositoryFromCollectionName } from './mongo.util';
import { CollectionSearchResult } from '../../collection/dto/collection-search-result.dto';
import { COLLECTION_COLLATION_LOCALE } from '../../constants';
import { BrokerAccountEntity } from '../entity/broker-account.entity';
import { EnvironmentEntity } from '../entity/environment.entity';
import { ProjectEntity } from '../entity/project.entity';
import { RepositoryEntity } from '../entity/repository.entity';
import { ServerEntity } from '../entity/server.entity';
import { ServiceInstanceEntity } from '../entity/service-instance.entity';
import { ServiceEntity } from '../entity/service.entity';
import { TeamEntity } from '../entity/team.entity';
import { UserEntity } from '../entity/user.entity';
import {
  CollectionEntityUnion,
  CollectionNames,
  CollectionNameStringEnum,
} from '../entity/collection-entity-union.type';
import { CollectionDtoUnion } from '../dto/collection-dto-union.type';

@Injectable()
export class CollectionMongoRepository implements CollectionRepository {
  constructor(
    @InjectRepository(CollectionConfigEntity)
    private readonly collectionConfigRepository: MongoEntityRepository<CollectionConfigEntity>,
    private readonly dataSource: MongoEntityManager,
  ) {}

  public assignCollection(
    collection: CollectionNames,
    data: any,
  ): CollectionEntityUnion[typeof collection] {
    const entity = this.constructCollection(collection);
    wrap(entity).assign(this.upgradeDtoToEntityAssignable(collection, data), {
      em: this.dataSource,
    });
    return entity;
  }

  /**
   * Modify the data to be assignable to an entity. This means converting strings to ObjectIds.
   * @param collection The collection name
   * @param data The entity data as a DTO
   * @returns The modified data
   */
  private upgradeDtoToEntityAssignable(
    collection: CollectionNames,
    data: CollectionDtoUnion[typeof collection],
  ): any {
    switch (collection) {
      case 'brokerAccount':
      case 'environment':
      case 'project':
      case 'repository':
      case 'server':
      case 'service':
      case 'team':
      case 'user':
        return data;
      case 'serviceInstance': {
        const siDto = data as any;
        if (siDto?.action && typeof siDto?.action.intention === 'string') {
          siDto.action.intention = new ObjectId(
            siDto.action.intention as string,
          );
        }

        if (siDto?.actionHistory && Array.isArray(siDto?.actionHistory)) {
          for (const action of siDto.actionHistory) {
            if (typeof action.intention === 'string') {
              action.intention = new ObjectId(action.intention as string);
            }
          }
        }
        return data;
      }
      default:
        // If this is an error then not all collection types are above
        // eslint-disable-next-line no-case-declarations
        const _exhaustiveCheck: never = collection;
        return _exhaustiveCheck;
    }
  }

  private constructCollection(collection: CollectionNames) {
    switch (collection) {
      case 'brokerAccount':
        return new BrokerAccountEntity();
      case 'environment':
        return new EnvironmentEntity();
      case 'project':
        return new ProjectEntity();
      case 'repository':
        return new RepositoryEntity();
      case 'server':
        return new ServerEntity();
      case 'serviceInstance':
        return new ServiceInstanceEntity();
      case 'service':
        return new ServiceEntity();
      case 'team':
        return new TeamEntity();
      case 'user':
        return new UserEntity();
      default:
        // If this is an error then not all collection types are above
        // eslint-disable-next-line no-case-declarations
        const _exhaustiveCheck: never = collection;
        return _exhaustiveCheck;
    }
  }

  public getCollectionConfigs(): Promise<CollectionConfigEntity[]> {
    return this.collectionConfigRepository.find({});
  }

  public async getCollectionConfigByName(
    collection: string,
  ): Promise<CollectionConfigEntity> {
    return this.collectionConfigRepository.findOneOrFail({
      collection: collection as CollectionNameStringEnum,
    });
  }

  public async getCollectionById<T extends keyof CollectionEntityUnion>(
    type: T,
    id: string,
  ): Promise<CollectionEntityUnion[T] | null> {
    const repo = getRepositoryFromCollectionName(this.dataSource, type);
    return repo.findOne({ _id: new ObjectId(id) } as any);
  }

  public async saveTags<T extends keyof CollectionEntityUnion>(
    type: T,
    id: string,
    tags: string[],
  ): Promise<string[]> {
    const repo = getRepositoryFromCollectionName(this.dataSource, type);

    repo
      .getCollection()
      .updateOne({ _id: new ObjectId(id) } as any, { $set: { tags } } as any);
    return tags;
  }

  public async getCollectionByVertexId<T extends keyof CollectionEntityUnion>(
    type: T,
    id: string,
  ): Promise<CollectionEntityUnion[T] | null> {
    return this.getCollection(type, { vertex: new ObjectId(id) });
  }

  public async getCollectionByKeyValue<T extends keyof CollectionEntityUnion>(
    type: T,
    key: keyof CollectionEntityUnion[T],
    value: string,
  ): Promise<CollectionEntityUnion[T] | null> {
    return this.getCollection(type, { [key]: value });
  }

  public async getCollection<T extends keyof CollectionEntityUnion>(
    type: T,
    whereClause: any,
    // | ObjectLiteral
    // | FindOptionsWhere<CollectionDtoUnion[T]>
    // | FindOptionsWhere<CollectionDtoUnion[T]>[],
  ): Promise<CollectionEntityUnion[T] | null> {
    const repo = getRepositoryFromCollectionName(this.dataSource, type);
    return repo.findOne(whereClause);
  }

  public async getCollections<T extends keyof CollectionEntityUnion>(
    type: T,
  ): Promise<CollectionEntityUnion[T][]> {
    const config = await this.getCollectionConfigByName(type);
    const repo = getRepositoryFromCollectionName(this.dataSource, type);
    return repo.find(
      {},
      {
        orderBy: {
          [config.fieldDefaultSort.field]: config.fieldDefaultSort.dir,
        } as any,
      },
    );
  }

  public async filterCollection<T extends keyof CollectionDtoUnion>(
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
  ): Promise<CollectionSearchResult<CollectionDtoUnion[T]>> {
    const repo = getRepositoryFromCollectionName(this.dataSource, type);
    const config = await this.getCollectionConfigByName(type);
    const sortField = sort && dir ? sort : config.fieldDefaultSort.field;
    const sortDir =
      sort && dir ? (dir === 'asc' ? 1 : -1) : config.fieldDefaultSort.dir;

    const tagsQuery = tags
      ? [
          {
            $match: {
              'collection.tags': { $in: tags },
            },
          },
        ]
      : [];
    const upstreamQuery = upstreamVertex
      ? [
          {
            $graphLookup: {
              from: 'edge',
              startWith: '$collection.vertex',
              connectFromField: 'source',
              connectToField: 'target',
              restrictSearchWithMatch: { restrict: { $ne: true } },
              as: 'upstream_path',
              maxDepth: 3,
            },
          },
          {
            $match: {
              'upstream_path.source': new ObjectId(upstreamVertex),
            },
          },
          {
            $unset: ['upstream_path'],
          },
        ]
      : [];
    const downstreamQuery = downstreamVertex
      ? [
          {
            $graphLookup: {
              from: 'edge',
              startWith: '$collection.vertex',
              connectFromField: 'target',
              connectToField: 'source',
              restrictSearchWithMatch: { restrict: { $ne: true } },
              as: 'downstream_path',
              maxDepth: 3,
            },
          },
          {
            $match: {
              'downstream_path.target': new ObjectId(downstreamVertex),
            },
          },
          {
            $unset: ['downstream_path'],
          },
        ]
      : [];
    const idQuery = id
      ? [
          {
            $match: {
              _id: new ObjectId(id),
            },
          },
        ]
      : [];
    const vertexQuery = vertexIds
      ? [
          {
            $match: {
              vertex: {
                $in: vertexIds.map((vertexId) => new ObjectId(vertexId)),
              },
            },
          },
        ]
      : [];
    return repo
      .getCollection()
      .aggregate(
        [
          ...idQuery,
          ...vertexQuery,
          {
            $replaceRoot: { newRoot: { ['collection']: `$$ROOT` } },
          },
          ...tagsQuery,
          ...upstreamQuery,
          // upstream
          {
            $lookup: {
              from: 'edge',
              localField: 'collection.vertex',
              foreignField: 'target',
              pipeline: [
                {
                  $lookup: {
                    from: 'vertex',
                    localField: 'source',
                    foreignField: '_id',
                    as: 'vertex',
                  },
                },
                { $unwind: '$vertex' },
              ],
              as: 'upstream',
            },
          },
          // downstream
          {
            $lookup: {
              from: 'edge',
              localField: 'collection.vertex',
              foreignField: 'source',
              pipeline: [
                {
                  $lookup: {
                    from: 'vertex',
                    localField: 'target',
                    foreignField: '_id',
                    as: 'vertex',
                  },
                },
                { $unwind: '$vertex' },
              ],
              as: 'downstream',
            },
          },
          ...downstreamQuery,
          {
            $lookup: {
              from: 'vertex',
              localField: 'collection.vertex',
              foreignField: '_id',
              as: 'vertex',
            },
          },
          { $unwind: '$vertex' },
          {
            $addFields: {
              id: '$_id',
            },
          },
          {
            $unset: ['_id'],
          },
          {
            $facet: {
              data: [
                {
                  $sort: {
                    [`collection.${sortField}`]: sortDir,
                  },
                },
                { $skip: offset },
                { $limit: limit },
              ],
              meta: [{ $count: 'total' }],
            },
          },
          { $unwind: '$meta' },
        ],
        {
          collation: {
            locale: COLLECTION_COLLATION_LOCALE,
          },
        },
      )
      .toArray()
      .then((array) => {
        if (array[0]) {
          const rval = array[0] as any;

          for (const datum of rval.data) {
            datum.collection.id = datum.collection._id;
            delete datum.collection._id;
            datum.vertex.id = datum.vertex._id;
            delete datum.vertex._id;
            if (datum.upstream) {
              datum.upstream = datum.upstream.map((edge) => {
                const vertex = edge.vertex;
                delete edge.vertex;
                // fix id
                edge.id = edge._id;
                delete edge._id;
                vertex.id = vertex._id;
                delete vertex._id;
                return {
                  edge,
                  vertex,
                };
              });
            }

            if (datum.downstream) {
              datum.downstream = datum.downstream.map((edge) => {
                const vertex = edge.vertex;
                delete edge.vertex;
                // fix id
                edge.id = edge._id;
                delete edge._id;
                vertex.id = vertex._id;
                delete vertex._id;
                return {
                  edge,
                  vertex,
                };
              });
            }
            datum.type = 'vertex';
          }
          return rval;
        } else {
          return {
            data: [],
            meta: { total: 0 },
          };
        }
      });
  }

  public async getCollectionTags<T extends keyof CollectionEntityUnion>(
    type: T,
  ): Promise<string[]> {
    const repo = getRepositoryFromCollectionName(this.dataSource, type);
    return repo.getCollection().distinct('tags', {});
  }

  public async exportCollection<T extends keyof CollectionEntityUnion>(
    type: T,
  ) {
    const repo = getRepositoryFromCollectionName(this.dataSource, type);
    return repo.findAll();
  }

  public async doUniqueKeyCheck(
    type: keyof CollectionEntityUnion,
    key: string,
    value: string,
  ): Promise<string[]> {
    const repo = getRepositoryFromCollectionName(this.dataSource, type);
    const array = await repo.find({
      [key]: value,
    });
    return array.map((val) => val.id.toString());
  }
}
