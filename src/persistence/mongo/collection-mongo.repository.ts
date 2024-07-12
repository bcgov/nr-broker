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
import { arrayIdFixer, getRepositoryFromCollectionName } from './mongo.util';
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
    upstreamVertex: string | undefined,
    downstreamVertex: string | undefined,
    id: string | undefined,
    vertexIds: string[] | undefined,
    offset: number,
    limit: number,
  ): Promise<CollectionSearchResult<CollectionDtoUnion[T]>> {
    const repo = getRepositoryFromCollectionName(this.dataSource, type);

    const upstreamQuery = upstreamVertex
      ? [
          {
            $match: {
              'upstream.edge.source': new ObjectId(upstreamVertex),
            },
          },
        ]
      : [];
    const downstreamQuery = downstreamVertex
      ? [
          {
            $match: {
              'downstream.edge.source': new ObjectId(downstreamVertex),
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
        {
          $lookup: {
            from: 'edge',
            localField: 'collection.vertex',
            foreignField: 'target',
            as: 'upstream.edge',
          },
        },
        ...upstreamQuery,
        {
          $lookup: {
            from: 'vertex',
            localField: 'upstream.edge.source',
            foreignField: '_id',
            as: 'upstream.vertex',
          },
        },
        ...downstreamQuery,
        {
          $lookup: {
            from: 'edge',
            localField: 'collection.vertex',
            foreignField: 'source',
            as: 'downstream.edge',
          },
        },
        {
          $lookup: {
            from: 'vertex',
            localField: 'downstream.edge.target',
            foreignField: '_id',
            as: 'downstream.vertex',
          },
        },
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
            arrayIdFixer(datum.downstream.edge);
            arrayIdFixer(datum.downstream.vertex);
            arrayIdFixer(datum.upstream.edge);
            arrayIdFixer(datum.upstream.vertex);
            datum.collection.id = datum.collection._id;
            delete datum.collection._id;
            datum.vertex.id = datum.vertex._id;
            delete datum.vertex._id;
            datum.upstream = Object.keys(datum.upstream.edge).map((index) => ({
              edge: datum.upstream.edge[index],
              vertex: datum.upstream.vertex[index],
            }));
            datum.downstream = Object.keys(datum.downstream.edge).map(
              (index) => ({
                edge: datum.downstream.edge[index],
                vertex: datum.downstream.vertex[index],
              }),
            );
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
