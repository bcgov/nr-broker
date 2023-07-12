import { Injectable, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { GraphService } from '../graph/graph.service';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { CollectionConfigDto } from '../persistence/dto/collection-config.dto';
import { UserDto } from '../persistence/dto/user.dto';
import { VertexInsertDto } from '../persistence/dto/vertex-rest.dto';
import { CollectionDtoUnion } from '../persistence/dto/collection-dto-union.type';
import {
  OAUTH2_CLIENT_MAP_EMAIL,
  OAUTH2_CLIENT_MAP_GUID,
  OAUTH2_CLIENT_MAP_NAME,
  OAUTH2_CLIENT_MAP_USERNAME,
} from '../constants';

@Injectable()
export class CollectionService {
  constructor(
    private readonly graphService: GraphService,
    private readonly collectionRepository: CollectionRepository,
  ) {}

  public async getCollectionConfig(): Promise<CollectionConfigDto[]> {
    return this.collectionRepository.getCollectionConfigs();
  }

  public async getCollectionConfigByName(
    collection: keyof CollectionDtoUnion,
  ): Promise<CollectionConfigDto | null> {
    return this.collectionRepository.getCollectionConfigByName(collection);
  }

  async getCollectionByVertexId<T extends keyof CollectionDtoUnion>(
    type: T,
    vertexId: string,
  ) {
    try {
      return this.collectionRepository.getCollectionByVertexId(type, vertexId);
    } catch (error) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
  }

  async upsertUser(req: Request, userInfo: any): Promise<UserDto> {
    const loggedInUser = new UserDto();
    loggedInUser.email = userInfo[OAUTH2_CLIENT_MAP_EMAIL];
    loggedInUser.guid = userInfo[OAUTH2_CLIENT_MAP_GUID];
    loggedInUser.name = userInfo[OAUTH2_CLIENT_MAP_NAME];
    loggedInUser.username = userInfo[OAUTH2_CLIENT_MAP_USERNAME].toLowerCase();

    const existingUser =
      await this.collectionRepository.getCollectionByKeyValue(
        'user',
        'guid',
        loggedInUser.guid,
      );
    if (existingUser) {
      // TODO: update part of upsert
      existingUser.roles = userInfo.client_roles ? userInfo.client_roles : [];
      return existingUser;
    } else {
      const vertex: VertexInsertDto = {
        collection: 'user',
        data: loggedInUser,
      };

      const insertedVertex = await this.graphService.addVertex(
        req,
        vertex,
        true,
      );
      const insertedUser =
        await this.collectionRepository.getCollectionByVertexId(
          'user',
          insertedVertex.id.toString(),
        );
      insertedUser.roles = userInfo.client_roles ? userInfo.client_roles : [];
      return insertedUser;
    }
  }
}
