import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  FindOptionsWhere,
  MongoRepository,
  ObjectLiteral,
} from 'typeorm';
import { ObjectId } from 'mongodb';
import { CollectionRepository } from '../interfaces/collection.repository';
import { CollectionDtoUnion } from '../dto/collection-dto-union.type';
import { CollectionConfigDto } from '../dto/collection-config.dto';
import { getRepositoryFromCollectionName } from './mongo.util';
import { CollectionSearchResult } from '../../collection/dto/collection-search-result.dto';

@Injectable()
export class CollectionMongoRepository implements CollectionRepository {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CollectionConfigDto)
    private readonly collectionConfigRepository: MongoRepository<CollectionConfigDto>,
  ) {}

  public getCollectionConfigs(): Promise<CollectionConfigDto[]> {
    return this.collectionConfigRepository.find({});
  }

  public async getCollectionConfigByName(
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

  public async saveTags<T extends keyof CollectionDtoUnion>(
    type: T,
    id: string,
    tags: string[],
  ): Promise<string[]> {
    const repo = getRepositoryFromCollectionName(this.dataSource, type);

    repo.updateOne({ _id: new ObjectId(id) }, { $set: { tags } });
    return tags;
  }

  public async getCollectionByVertexId<T extends keyof CollectionDtoUnion>(
    type: T,
    id: string,
  ): Promise<CollectionDtoUnion[T] | null> {
    return this.getCollection(type, { vertex: new ObjectId(id) });
  }

  public async getCollectionByKeyValue<T extends keyof CollectionDtoUnion>(
    type: T,
    key: keyof CollectionDtoUnion[T],
    value: string,
  ): Promise<CollectionDtoUnion[T] | null> {
    return this.getCollection(type, { [key]: value });
  }

  public async getCollection<T extends keyof CollectionDtoUnion>(
    type: T,
    whereClause:
      | ObjectLiteral
      | FindOptionsWhere<CollectionDtoUnion[T]>
      | FindOptionsWhere<CollectionDtoUnion[T]>[],
  ): Promise<CollectionDtoUnion[T] | null> {
    const repo = getRepositoryFromCollectionName(this.dataSource, type);
    return repo.findOne({
      where: whereClause,
    });
  }

  public async getCollections<T extends keyof CollectionDtoUnion>(
    type: T,
  ): Promise<CollectionDtoUnion[T][]> {
    const repo = getRepositoryFromCollectionName(this.dataSource, type);
    return repo.find();
  }

  public async searchCollection<T extends keyof CollectionDtoUnion>(
    type: T,
    tags: string[] | undefined,
    upstreamVertex: string | undefined,
    downstreamVertex: string | undefined,
    id: string | undefined,
    vertexIds: string[] | undefined,
    offset: number,
    limit: number,
  ): Promise<CollectionSearchResult<CollectionDtoUnion[T]>> {
    const repo = getRepositoryFromCollectionName(this.dataSource, type);

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
            $match: {
              'downstream.source': new ObjectId(downstreamVertex),
            },
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
      .aggregate([
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
        { $sort: { 'collection.name': -1 } },
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
              { $sort: { 'collection.name': 1 } },
              { $skip: offset },
              { $limit: limit },
            ],
            meta: [{ $count: 'total' }],
          },
        },
        { $unwind: '$meta' },
      ])
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

  public async getCollectionTags<T extends keyof CollectionDtoUnion>(type: T) {
    const repo = getRepositoryFromCollectionName(this.dataSource, type);
    return repo.distinct('tags', {});
  }

  public async exportCollection<T extends keyof CollectionDtoUnion>(type: T) {
    const repo = getRepositoryFromCollectionName(this.dataSource, type);
    return repo.find();
  }

  public async doUniqueKeyCheck(
    type: keyof CollectionDtoUnion,
    key: string,
    value: string,
  ): Promise<string[]> {
    const repo = getRepositoryFromCollectionName(this.dataSource, type);
    const array = await repo.find({
      where: {
        [key]: value,
      },
    });
    return array.map((val) => val.id.toString());
  }
}
