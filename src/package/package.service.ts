import { BadRequestException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { PackageBuildDto } from '../persistence/dto/package-build.dto';
import { BuildRepository } from '../persistence/interfaces/build.repository';
import { RedisService } from '../redis/redis.service';
import { REDIS_PUBSUB } from '../constants';

@Injectable()
export class PackageService {
  constructor(
    private readonly auditService: AuditService,
    private readonly collectionRepository: CollectionRepository,
    private readonly buildRepository: BuildRepository,
    private readonly redisService: RedisService,
  ) {}

  async get(id: string): Promise<PackageBuildDto> {
    return this.buildRepository.getBuild(id);
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
