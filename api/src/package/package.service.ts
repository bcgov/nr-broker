import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { REDIS_PUBSUB } from '../constants';
import { RedisService } from '../redis/redis.service';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { BuildRepository } from '../persistence/interfaces/build.repository';
import { PackageBuildDto } from '../persistence/dto/package-build.dto';
import { PackageBuildEntity } from '../persistence/entity/package-build.entity';
import { ActionUtil } from '../util/action.util';

@Injectable()
export class PackageService {
  constructor(
    private readonly actionUtil: ActionUtil,
    private readonly auditService: AuditService,
    private readonly collectionRepository: CollectionRepository,
    private readonly buildRepository: BuildRepository,
    private readonly redisService: RedisService,
  ) {}

  async get(id: string): Promise<PackageBuildEntity> {
    return this.buildRepository.getBuild(id);
  }

  async search(
    serviceId: string,
    hideReplaced: boolean,
    sort: string | undefined,
    dir: string | undefined,
    offset: number,
    limit: number,
  ) {
    return this.buildRepository.searchBuild(
      serviceId,
      hideReplaced,
      offset,
      limit,
    );
  }

  async getServiceBuildByVersion(
    serviceName: string,
    name: string,
    semver: string,
  ): Promise<PackageBuildDto> {
    const parsedVersion = this.actionUtil.parseVersion(semver);
    if (!this.actionUtil.isStrictSemver(parsedVersion)) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Bad request',
        error: 'Invalid semver version',
      });
    }
    const serviceEntity =
      await this.collectionRepository.getCollectionByKeyValue(
        'service',
        'name',
        serviceName,
      );

    if (!serviceEntity) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not Found',
        error: `Check service exists: ${serviceName}`,
      });
    }
    const result = await this.buildRepository.getServiceBuildByVersion(
      serviceEntity.id.toString(),
      name,
      parsedVersion,
    );
    if (!result) {
      throw new NotFoundException();
    }
    return result as unknown as Promise<PackageBuildDto>;
  }

  async approve(req: Request, id: string, userGuid: string): Promise<boolean> {
    const user = req.user;
    const packageDto = await this.buildRepository.getBuild(id);
    const userDto = await this.collectionRepository.getCollectionByKeyValue(
      'user',
      'guid',
      userGuid,
    );
    const envDto = await this.collectionRepository.getCollectionByKeyValue(
      'environment',
      'name',
      'production',
    );

    if (!packageDto || !userDto || !envDto) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Bad request',
        error: '',
      });
    }

    const serviceDto = await this.collectionRepository.getCollectionById(
      'service',
      packageDto.service.toString(),
    );

    if (!serviceDto) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Bad request',
        error: 'Service not found',
      });
    }

    this.auditService.recordPackageBuildApprove(req, user, 'success');

    await this.buildRepository.approvePackage(packageDto, userDto, envDto);

    this.redisService.publish(REDIS_PUBSUB.GRAPH, {
      data: {
        event: 'collection-edit',
        collection: { id, vertex: serviceDto.vertex.toString() },
      },
    });

    return true;
  }
}
