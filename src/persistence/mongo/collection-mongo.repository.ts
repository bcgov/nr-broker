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
import { PackageDto } from '../../intention/dto/package.dto';
import { PackageBuildDto } from '../dto/package-build.dto';
import { SemverVersion } from '../../util/action.util';
import { COLLECTION_MAX_EMBEDDED } from '../../constants';
import { IntentionActionPointerDto } from '../dto/intention-action-pointer.dto';

@Injectable()
export class CollectionMongoRepository implements CollectionRepository {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CollectionConfigDto)
    private readonly collectionConfigRepository: MongoRepository<CollectionConfigDto>,
    @InjectRepository(PackageBuildDto)
    private readonly packageBuildRepository: MongoRepository<PackageBuildDto>,
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
              'upstream_edge.source': new ObjectId(upstreamVertex),
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

          for (const datum of rval.data) {
            this.arrayIdFixer(datum.downstream);
            this.arrayIdFixer(datum.downstream_edge);
            this.arrayIdFixer(datum.upstream);
            this.arrayIdFixer(datum.upstream_edge);
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

  public async addBuild(
    serviceId: string,
    name: string,
    semvar: SemverVersion,
    buildPackage: PackageDto,
  ) {
    const result = await this.packageBuildRepository.insertOne({
      approval: [],
      installed: [],
      service: new ObjectId(serviceId),
      name,
      semvar: `${semvar.major}.${semvar.minor}.${semvar.patch}`,
      package: buildPackage,
      timestamps: {
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    if (!result.acknowledged) {
      throw new Error();
    }
    const rval = await this.getBuild(result.insertedId.toString());
    if (rval === null) {
      throw new Error();
    }

    return rval;
  }

  public async getBuild(id: string) {
    return this.packageBuildRepository.findOne({
      where: { _id: new ObjectId(id) },
    });
  }

  public async getBuildByPackageDetail(
    serviceId: string,
    name: string,
    semvar: SemverVersion,
  ) {
    return this.packageBuildRepository
      .find({
        service: new ObjectId(serviceId),
        name,
        semvar: `${semvar.major}.${semvar.minor}.${semvar.patch}`,
      })
      .then((value) => {
        return value.length === 1 ? value[0] : null;
      });
  }

  public async addInstallActionToBuild(
    buildId: string,
    pointer: IntentionActionPointerDto,
  ) {
    const collResult = await this.packageBuildRepository.updateOne(
      { _id: new ObjectId(buildId) },
      {
        $push: {
          installed: {
            $each: [pointer],
            $slice: -COLLECTION_MAX_EMBEDDED,
          },
        } as any,
      },
    );
    if (collResult.matchedCount !== 1) {
      throw new Error();
    }

    return this.getBuild(buildId);
  }

  public async searchBuild(serviceId: string, offset: number, limit: number) {
    return this.packageBuildRepository
      .aggregate([
        {
          $match: {
            service: new ObjectId(serviceId),
          },
          $sort: { _id: -1 },
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
        } else {
          return {
            data: [],
            meta: { total: 0 },
          };
        }
      });
  }

  private arrayIdFixer(array: any[]) {
    for (const item of array) {
      item.id = item._id;
      delete item._id;
    }
  }
}
