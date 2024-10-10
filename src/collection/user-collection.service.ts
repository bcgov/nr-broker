import { Injectable } from '@nestjs/common';
import { Request } from 'express';

import { USER_ALIAS_DOMAIN_GITHUB } from '../constants';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { GraphService } from '../graph/graph.service';
import { UserDto } from '../persistence/dto/user.dto';
import { UserImportDto } from './dto/user-import.dto';
import { UserRolesDto } from './dto/user-roles.dto';
import { VertexInsertDto } from '../persistence/dto/vertex-rest.dto';
import { GithubService } from '../github/github.service';
import { AuthService } from '../auth/auth.service';

/**
 * Assists with user collection activities
 */
@Injectable()
export class UserCollectionService {
  constructor(
    private readonly collectionRepository: CollectionRepository,
    private readonly authService: AuthService,
    private readonly githubService: GithubService,
    private readonly graphService: GraphService,
  ) {}

  async lookupUserByGuid(guid: string): Promise<UserDto> {
    return this.collectionRepository.getCollectionByKeyValue(
      'user',
      'guid',
      guid,
    );
  }

  async lookupUserByName(username: string, domain?: string): Promise<UserDto> {
    if (!domain) {
      [username, domain] = username.split('@');
    }
    return this.collectionRepository.getCollection('user', {
      username,
      domain,
    });
  }

  async extractUserFromRequest(req: Request): Promise<UserRolesDto> {
    const loggedInUser = new UserRolesDto('', (req.user as any).userinfo);
    const vertex = await this.upsertUser(req, loggedInUser.toUserImportDto());
    return new UserRolesDto(vertex.toString(), (req.user as any).userinfo);
  }

  async upsertUser(req: Request, userInfo: UserImportDto) {
    const existingUser =
      await this.collectionRepository.getCollectionByKeyValue(
        'user',
        'guid',
        userInfo.guid,
      );
    const vertex: VertexInsertDto = {
      collection: 'user',
      data: userInfo,
    };
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
    const existingUser = await this.authService.getUserDto(req);
    if (
      !(await this.githubService.isRequestStateMatching(
        existingUser.id.toString(),
        state,
      ))
    ) {
      console.log('hi');
    }
    // console.log(state);
    const token = await this.githubService.getUserAccessToken(code);
    const userData = await this.githubService.getUserInfo(token);

    // console.log(userData);

    const vertex: VertexInsertDto = {
      collection: 'user',
      data: {
        ...existingUser,
        alias: [
          {
            domain: USER_ALIAS_DOMAIN_GITHUB,
            guid: userData.id,
            name: userData.name,
            username: userData.login,
            raw: userData,
          },
        ],
      },
    };
    delete vertex.data.id;
    delete vertex.data.vertex;

    // console.log(vertex);

    await this.graphService.editVertex(
      req,
      existingUser.vertex.toString(),
      vertex,
      true,
    );
    return this.authService.getUserDto(req);
  }
}
