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

  /**
   * Links a GitHub alias to an existing user via GitHub Oauth
   * @param req The request object
   * @param state GitHub Oauth state
   * @param code Code from GitHub Oauth
   * @returns Updated user with GitHub alias linked
   * @throws BadRequestException if user not found or state does not match
   */
  public async linkGithub(req: Request, state: string, code: string) {
    const currentUser = await this.authService.getUser(req);
    if (!currentUser) {
      throw new BadRequestException('User not found');
    }
    this.auditService.recordAliasLink(
      currentUser,
      'info',
      'unknown',
      'GitHub Oauth callback initiated for account link',
    );
    if (
      !(await this.githubService.isRequestStateMatching(currentUser.id, state))
    ) {
      this.auditService.recordAliasLink(
        currentUser,
        'end',
        'failure',
        'GitHub Oauth state does not match for account link',
      );
      throw new BadRequestException('Request state does not match');
    }
    const currentUserObj = currentUser.toPOJO();
    delete currentUserObj.id;
    delete currentUserObj._id;
    delete currentUserObj.vertex;

    const token = await this.githubService.getUserAccessToken(code);
    const userData = await this.githubService.getUserInfo(token);
    const guid = userData.id.toString();

    const aliasUser = await this.collectionRepository.getCollection('user', {
      alias: {
        guid,
        USER_ALIAS_DOMAIN_GITHUB,
      },
    });

    if (aliasUser && aliasUser.guid !== currentUser.guid) {
      const removeAliasVertex = new VertexInsertDto(
        'user',
        plainToInstance(UserBaseDto, {
          ...aliasUser,
          alias: aliasUser.alias.filter(
            (a) => a.domain !== USER_ALIAS_DOMAIN_GITHUB,
          ),
        }),
      );
      await this.graphService.editVertex(
        req,
        aliasUser.vertex.toString(),
        removeAliasVertex,
        true,
      );
      this.auditService.recordAliasLink(
        aliasUser,
        'info',
        'unknown',
        `Removed GitHub alias (${guid}) from previous account`,
      );
    }

    this.auditService.recordAliasLink(
      currentUser,
      'info',
      'unknown',
      `Linking GitHub alias (${guid}) to account`,
    );

    const vertex = new VertexInsertDto(
      'user',
      plainToInstance(UserBaseDto, {
        ...currentUserObj,
        alias: [
          {
            domain: USER_ALIAS_DOMAIN_GITHUB,
            guid,
            name: userData.name,
            username: userData.login,
          },
        ],
      }),
    );

    await this.graphService.editVertex(
      req,
      currentUser.vertex.toString(),
      vertex,
      true,
    );

    this.auditService.recordAliasLink(
      currentUser,
      'end',
      'success',
      'GitHub Oauth completed for account link',
    );
    return this.authService.getUser(req);
  }
}
