import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { PackageBuildDto } from '../persistence/dto/package-build.dto';
import { BuildRepository } from '../persistence/interfaces/build.repository';

@Injectable()
export class PackageService {
  constructor(
    private readonly auditService: AuditService,
    private readonly collectionRepository: CollectionRepository,
    private readonly buildRepository: BuildRepository,
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

    this.auditService.recordPackageBuildApprove(req, user, 'success');

    await this.buildRepository.approvePackage(packageDto, userDto, envDto);
    console.log(userDto);
    console.log(packageDto);

    return true;
  }
}
