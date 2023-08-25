import { Injectable, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { GraphService } from '../graph/graph.service';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { CollectionConfigDto } from '../persistence/dto/collection-config.dto';
import { VertexInsertDto } from '../persistence/dto/vertex-rest.dto';
import { CollectionDtoUnion } from '../persistence/dto/collection-dto-union.type';
import { UserImportDto } from './dto/user-import.dto';
import { UserRolesDto } from './dto/user-roles.dto';

@Injectable()
export class CollectionService {
  constructor(
    private readonly collectionRepository: CollectionRepository,
    private readonly graphService: GraphService,
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

  async searchCollection<T extends keyof CollectionDtoUnion>(
    type: T,
    upstreamVertex: string | undefined,
    vertexId: string | undefined,
    offset: number,
    limit: number,
  ) {
    return this.collectionRepository.searchCollection(
      type,
      upstreamVertex,
      vertexId,
      offset,
      limit,
    );
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
      (existingUser.email !== userInfo.email ||
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
    console.log(existingUser);
    return existingUser.vertex;
  }
}
