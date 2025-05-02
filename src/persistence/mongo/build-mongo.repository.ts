import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { MongoEntityRepository } from '@mikro-orm/mongodb';
import { ObjectId } from 'mongodb';

import { SemverVersion } from '../../util/action.util';
import { COLLECTION_MAX_EMBEDDED } from '../../constants';
import { IntentionActionPointerEmbeddable } from '../entity/intention-action-pointer.embeddable';
import { BuildRepository } from '../interfaces/build.repository';
import { arrayIdFixer } from './mongo.util';
import { UserEntity } from '../entity/user.entity';
import { EnvironmentEntity } from '../entity/environment.entity';
import { PackageBuildEntity } from '../entity/package-build.entity';
import { PackageEmbeddable } from '../../intention/entity/package.embeddable';
import { EntityManager } from '@mikro-orm/core';
@Injectable()
export class BuildMongoRepository implements BuildRepository {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(PackageBuildEntity)
    private readonly packageBuildRepository: MongoEntityRepository<PackageBuildEntity>,
  ) {}

  public async addBuild(
    intentionId: string,
    action: string,
    serviceId: string,
    name: string,
    semver: SemverVersion,
    buildPackage: PackageEmbeddable,
  ) {
    const packageBuild = new PackageBuildEntity(
      new ObjectId(serviceId),
      name,
      action,
      new ObjectId(intentionId),
      `${semver.major}.${semver.minor}.${semver.patch}`,
      buildPackage,
    );

    await this.em.persist(packageBuild).flush();

    return packageBuild;
  }

  public async getBuild(id: string) {
    return await this.packageBuildRepository.findOneOrFail({
      _id: new ObjectId(id),
    });
  }

  public async getServiceBuildByVersion(
    serviceId: string,
    name: string,
    semver: SemverVersion,
  ) {
    return this.packageBuildRepository
      .find({
        service: new ObjectId(serviceId),
        name,
        semver: `${semver.major}.${semver.minor}.${semver.patch}`,
        replaced: false,
      })
      .then((value) => {
        return value.length === 1 ? value[0] : null;
      });
  }

  public async addInstallActionToBuild(
    buildId: string,
    pointer: IntentionActionPointerEmbeddable,
  ) {
    const collResult = await this.packageBuildRepository
      .getCollection()
      .updateOne(
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

  public async searchBuild(
    serviceId: string,
    hideReplaced: boolean,
    offset: number,
    limit: number,
  ) {
    return this.packageBuildRepository
      .getCollection()
      .aggregate([
        {
          $match: {
            service: new ObjectId(serviceId),
            ...(hideReplaced ? { replaced: false } : {}),
          },
        },
        {
          $sort: { _id: -1 },
        },
        {
          $facet: {
            data: [
              { $sort: { 'timestamps.createdAt': -1 } },
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

  public async approvePackage(
    packageBuild: PackageBuildEntity,
    user: UserEntity,
    environment: EnvironmentEntity,
  ): Promise<PackageBuildEntity> {
    const result = await this.packageBuildRepository.getCollection().updateOne(
      { _id: packageBuild._id },
      {
        $set: {
          'timestamps.updatedAt': new Date(),
        },
        $push: {
          approval: {
            $each: [
              {
                environment: environment.id,
                user: user.id,
                at: new Date(),
              },
            ],
            // $slice: -COLLECTION_MAX_EMBEDDED,
          },
        } as any,
      },
    );
    if (result.matchedCount !== 1) {
      throw new Error();
    }
    return this.getBuild(packageBuild.id.toString());
  }

  public async markBuildAsReplaced(
    packageBuild: PackageBuildEntity,
  ): Promise<void> {
    packageBuild.replaced = true;
    packageBuild.timestamps.updatedAt = new Date();
    await this.em.persist(packageBuild).flush();
  }
}
