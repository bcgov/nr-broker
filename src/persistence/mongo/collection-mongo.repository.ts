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
    private dataSource: DataSource,
    @InjectRepository(CollectionConfigDto)
    private collectionConfigRepository: MongoRepository<CollectionConfigDto>,
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

  public async getCollectionByVertexId<T extends keyof CollectionDtoUnion>(
    type: T,
    id: string,
  ): Promise<CollectionDtoUnion[T] | null> {
    return this.getCollection(type, { vertex: new ObjectId(id) });
  }

  public async getCollectionByKeyValue<T extends keyof CollectionDtoUnion>(
    type: T,
    key: string,
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
    vertexId: string | undefined,
    offset: number,
    limit: number,
  ): Promise<CollectionSearchResult<CollectionDtoUnion[T]>> {
    const repo = getRepositoryFromCollectionName(this.dataSource, type);

    const upstreamQuery = upstreamVertex
      ? [
          {
            $match: {
              'upstream_edge.source': new ObjectId(upstreamVertex),
            },
          },
        ]
      : [];
    const vertexQuery = vertexId
      ? [
          {
            $match: {
              _id: new ObjectId(vertexId),
            },
          },
        ]
      : [];
    return repo
      .aggregate([
        ...vertexQuery,
        {
          $lookup: {
            from: 'edge',
            localField: 'vertex',
            foreignField: 'target',
            as: 'upstream_edge',
          },
        },
        ...upstreamQuery,
        {
          $lookup: {
            from: 'vertex',
            localField: 'upstream_edge.source',
            foreignField: '_id',
            as: 'upstream',
          },
        },
        {
          $lookup: {
            from: 'edge',
            localField: 'vertex',
            foreignField: 'source',
            as: 'downstream_edge',
          },
        },
        {
          $lookup: {
            from: 'vertex',
            localField: 'downstream_edge.target',
            foreignField: '_id',
            as: 'downstream',
          },
        },
        { $sort: { name: -1 } },
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
              { $sort: { name: 1 } },
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
          const rval = array[0] as unknown as CollectionSearchResult<
            CollectionDtoUnion[T]
          >;
          // TODO: fix _ids
          return rval;
        } else {
          return {
            data: [],
            meta: { total: 0 },
          };
        }
      });
  }
}
