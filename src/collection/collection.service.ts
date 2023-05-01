import { Injectable, NotFoundException } from '@nestjs/common';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { CollectionConfigDto } from '../persistence/dto/collection-config.dto';
import { UserDto } from '../persistence/dto/user.dto';
import { GraphService } from '../graph/graph.service';
import { VertexInsertDto } from '../persistence/dto/vertex-rest.dto';
import { Request } from 'express';

@Injectable()
export class CollectionService {
  constructor(
    private readonly graphService: GraphService,
    private readonly collectionRepository: CollectionRepository,
  ) {}

  public async getCollectionConfig(): Promise<CollectionConfigDto[]> {
    return this.collectionRepository.getCollectionConfigs();
  }

  async getCollectionByVertexId(type: string, id: string) {
    try {
      return this.collectionRepository.getCollectionByVertexId(type, id);
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
    loggedInUser.email = userInfo.email;
    loggedInUser.guid = userInfo.idir_user_guid;
    loggedInUser.name = userInfo.display_name;
    loggedInUser.username = userInfo.idir_username.toLowerCase();

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
