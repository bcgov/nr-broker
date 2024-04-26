import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { PackageDto } from '../../intention/dto/package.dto';
import { PackageBuildDto } from '../dto/package-build.dto';
import { SemverVersion } from '../../util/action.util';
import { COLLECTION_MAX_EMBEDDED } from '../../constants';
import { IntentionActionPointerDto } from '../dto/intention-action-pointer.dto';
import { BuildRepository } from '../interfaces/build.repository';
import { arrayIdFixer } from './mongo.util';

@Injectable()
export class BuildMongoRepository implements BuildRepository {
  constructor(
    @InjectRepository(PackageBuildDto)
    private readonly packageBuildRepository: MongoRepository<PackageBuildDto>,
  ) {}

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
        $set: {
          'timestamps.updatedAt': new Date(),
        },
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
        },
        {
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
          arrayIdFixer((array[0] as any).data);
          return array[0] as any;
        } else {
          return {
            data: [],
            meta: { total: 0 },
          };
        }
      });
  }
}
