import { BadRequestException, Injectable } from '@nestjs/common';
import { Request } from 'express';

import { USER_ALIAS_DOMAIN_GITHUB } from '../constants';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { GraphService } from '../graph/graph.service';
import { UserEntity } from '../persistence/entity/user.entity';
import { UserRolesDto } from './dto/user-roles.dto';
import { VertexInsertDto } from '../persistence/dto/vertex.dto';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { GithubService } from '../github/github.service';
import { UserUtil } from '../util/user.util';
import { UserBaseDto } from '../persistence/dto/user.dto';
import { plainToInstance } from 'class-transformer';

/**
 * Assists with user collection activities
 */
@Injectable()
export class UserCollectionService {
  constructor(
    private readonly collectionRepository: CollectionRepository,
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
    private readonly githubService: GithubService,
    private readonly graphService: GraphService,
    private readonly userUtil: UserUtil,
  ) {}

  async lookupUserByGuid(guid: string): Promise<UserEntity> {
    return this.collectionRepository.getCollectionByKeyValue(
      'user',
      'guid',
      guid,
    );
  }

  async lookupUserByAlias(guid: string, domain?: string): Promise<UserEntity> {
    if (!domain) {
      [guid, domain] = guid.split('@');
    }
    return this.collectionRepository.getCollection('user', {
      alias: {
        guid,
        domain,
      },
    });
  }

  async lookupUserByName(
    username: string,
    domain?: string,
  ): Promise<UserEntity> {
    if (!domain) {
      [username, domain] = username.split('@');
    }
    return this.collectionRepository.getCollection('user', {
      username,
      domain,
    });
  }

  async extractUserFromRequest(req: Request): Promise<UserRolesDto> {
    const loggedInUser = this.userUtil.mapUserToUserRolesDto(
      '',
      (req.user as any).userinfo,
    );
    const vertex = await this.upsertUser(req, loggedInUser);
    const collection = await this.collectionRepository.getCollectionByVertexId(
      'user',
      vertex.toString(),
    );
    return this.userUtil.mapUserToUserRolesDto(
      vertex.toString(),
      (req.user as any).userinfo,
      collection?.alias,
    );
  }

  async upsertUser(req: Request, userInfo: UserBaseDto) {
    const existingUser =
      await this.collectionRepository.getCollectionByKeyValue(
        'user',
        'guid',
        userInfo.guid,
      );
    const vertex = new VertexInsertDto('user', userInfo);
    if (
      existingUser &&
      (existingUser.domain !== userInfo.domain ||
        existingUser.email !== userInfo.email ||
        existingUser.name !== userInfo.name ||
        existingUser.username !== userInfo.username)
    ) {
      return (
        await this.graphService.editVertex(
          req,
          existingUser.vertex.toString(),
          vertex,
          true,
        )
      ).id;
    } else if (!existingUser) {
      return (await this.graphService.addVertex(req, vertex, true)).id;
    }
    return existingUser.vertex;
  }

  public async linkGithub(req: Request, state: string, code: string) {
    const existingUser = await this.authService.getUser(req);
    if (!existingUser) {
      throw new BadRequestException('User not found');
    }
    this.auditService.recordAliasLink(
      existingUser,
      'info',
      'unknown',
      'GitHub Oauth callback initiated for account link',
    );
    if (
      !(await this.githubService.isRequestStateMatching(existingUser.id, state))
    ) {
      this.auditService.recordAliasLink(
        existingUser,
        'end',
        'failure',
        'GitHub Oauth state does not match for account link',
      );
      throw new BadRequestException('Request state does not match');
    }
    const existingUserObj = existingUser.toPOJO();
    delete existingUserObj.id;
    delete existingUserObj._id;
    delete existingUserObj.vertex;

    const token = await this.githubService.getUserAccessToken(code);
    const userData = await this.githubService.getUserInfo(token);

    const vertex = new VertexInsertDto(
      'user',
      plainToInstance(UserBaseDto, {
        ...existingUserObj,
        alias: [
          {
            domain: USER_ALIAS_DOMAIN_GITHUB,
            guid: userData.id.toString(),
            name: userData.name,
            username: userData.login,
          },
        ],
      }),
    );

    await this.graphService.editVertex(
      req,
      existingUser.vertex.toString(),
      vertex,
      true,
    );

    this.auditService.recordAliasLink(
      existingUser,
      'end',
      'success',
      'GitHub Oauth completed for account link',
    );
    return this.authService.getUser(req);
  }
}
