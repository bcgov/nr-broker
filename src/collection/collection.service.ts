import { Injectable, NotFoundException } from '@nestjs/common';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { CollectionConfigDto } from '../persistence/dto/collection-config.dto';
import { UserDto } from '../persistence/dto/user.dto';
import { GraphService } from '../graph/graph.service';
import { VertexCollectionDto } from '../persistence/dto/vertex.dto';
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
    console.log(existingUser);
    if (existingUser) {
      // TODO: update part of upsert
      existingUser.roles = userInfo.client_roles ? userInfo.client_roles : [];
      return existingUser;
    } else {
      const vertex = new VertexCollectionDto();
      vertex.collection = 'user';
      vertex.data = loggedInUser;
      console.log(vertex);

      const insertedVertex = await this.graphService.addVertex(req, vertex, true);
      console.log(insertedVertex);
      const insertedUser =
        await this.collectionRepository.getCollectionByVertexId(
          'user',
          insertedVertex.id.toString(),
        );
      console.log(insertedUser);
      insertedUser.roles = userInfo.client_roles ? userInfo.client_roles : [];
      return insertedUser;
    }
  }

  //   "userinfo": {
  //     "idir_user_guid": "483CFF50E3E94A22BDB082B56DE564B6",
  //     "sub": "483cff50e3e94a22bdb082b56de564b6@azureidir",
  //     "idir_username": "MBYSTEDT",
  //     "email_verified": false,
  //     "name": "Bystedt, Matthew WLRS:EX",
  //     "preferred_username": "483cff50e3e94a22bdb082b56de564b6@azureidir",
  //     "given_name": "Matthew",
  //     "display_name": "Bystedt, Matthew WLRS:EX",
  //     "family_name": "Bystedt",
  //     "email": "matthew.bystedt@gov.bc.ca"
  // }
}
