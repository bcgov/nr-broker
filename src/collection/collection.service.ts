import { Injectable, NotFoundException } from '@nestjs/common';
import { catchError, firstValueFrom, of } from 'rxjs';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { CollectionConfigDto } from '../persistence/dto/collection-config.dto';
import { CollectionDtoUnion } from '../persistence/dto/collection-dto-union.type';
import { TokenService } from '../token/token.service';
import { ProjectDto } from '../persistence/dto/project.dto';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { CollectionIndex } from '../graph/graph.constants';
import { VAULT_ENVIRONMENTS_SHORT } from '../constants';

@Injectable()
export class CollectionService {
  constructor(
    private readonly collectionRepository: CollectionRepository,
    private readonly graphRepository: GraphRepository,
    private readonly tokenService: TokenService,
  ) {}

  public async getCollectionConfig(): Promise<CollectionConfigDto[]> {
    return this.collectionRepository.getCollectionConfigs();
  }

  public async getCollectionConfigByName(
    collection: keyof CollectionDtoUnion,
  ): Promise<CollectionConfigDto | null> {
    return this.collectionRepository.getCollectionConfigByName(collection);
  }

  async getCollectionById<T extends keyof CollectionDtoUnion>(
    type: T,
    id: string,
  ) {
    try {
      return this.collectionRepository.getCollectionById(type, id);
    } catch (error) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
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

  async getServiceSecureInfo(serviceId: string) {
    const service = await this.collectionRepository.getCollectionById(
      'service',
      serviceId,
    );
    if (!service) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not Found',
        error: `Check service exists: ${serviceId}`,
      });
    }
    const vertices = await this.graphRepository.getUpstreamVertex<ProjectDto>(
      service.vertex.toString(),
      CollectionIndex.Project,
      null,
    );
    if (vertices.length !== 1) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not Found',
        error: `Could not find project for: ${service.name} : ${serviceId}`,
      });
    }
    const project = vertices[0].collection;
    const roleIds = await Promise.all(
      VAULT_ENVIRONMENTS_SHORT.map((env) =>
        this.getRoleIdForApplicationSupressed(project.name, service.name, env),
      ),
    );

    return {
      roleIds: Object.fromEntries(
        VAULT_ENVIRONMENTS_SHORT.map((key, i) => [key, roleIds[i]]),
      ),
    };
  }

  private async getRoleIdForApplicationSupressed(
    projectName: string,
    serviceName: string,
    environment: string,
  ): Promise<string | null> {
    return firstValueFrom(
      this.tokenService
        .getRoleIdForApplication(projectName, serviceName, environment)
        .pipe(
          catchError((err) => {
            if (err instanceof NotFoundException) {
              return of(null);
            }
            throw err;
          }),
        ),
    );
  }
}
