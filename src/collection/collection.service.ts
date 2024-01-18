import { Injectable, NotFoundException } from '@nestjs/common';
import { catchError, firstValueFrom, of } from 'rxjs';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import {
  CollectionDtoRestUnion,
  CollectionDtoUnion,
} from '../persistence/dto/collection-dto-union.type';
import { TokenService } from '../token/token.service';
import { ProjectDto } from '../persistence/dto/project.dto';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { CollectionIndex } from '../graph/graph.constants';
import { VAULT_ENVIRONMENTS_SHORT } from '../constants';
import { ServiceInstanceDto } from '../persistence/dto/service-instance.dto';
import { ActionUtil } from '../util/action.util';
import { CollectionConfigResponseDto } from '../persistence/dto/collection-config-rest.dto';
import { IntentionActionPointerRestDto } from '../persistence/dto/intention-action-pointer-rest.dto';
import { IntentionService } from '../intention/intention.service';
import { PERSISTENCE_TYPEAHEAD_SUBQUERY_LIMIT } from '../persistence/persistence.constants';

@Injectable()
export class CollectionService {
  constructor(
    private readonly collectionRepository: CollectionRepository,
    private readonly graphRepository: GraphRepository,
    private readonly intentionService: IntentionService,
    private readonly actionUtil: ActionUtil,
    private readonly tokenService: TokenService,
  ) {}

  public async getCollectionConfig(): Promise<CollectionConfigResponseDto[]> {
    return this.collectionRepository.getCollectionConfigs() as unknown as Promise<
      CollectionConfigResponseDto[]
    >;
  }

  public async getCollectionConfigByName(
    collection: keyof CollectionDtoUnion,
  ): Promise<CollectionConfigResponseDto | null> {
    return this.collectionRepository.getCollectionConfigByName(
      collection,
    ) as unknown as Promise<CollectionConfigResponseDto | null>;
  }

  async getCollectionById<T extends keyof CollectionDtoUnion>(
    type: T,
    id: string,
  ) {
    try {
      return this.collectionRepository
        .getCollectionById(type, id)
        .then((collection) => this.processForPointers(type, collection));
    } catch (error) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
  }

  private collectionToRest<T extends keyof CollectionDtoUnion>(
    config: CollectionDtoUnion[T],
  ): CollectionDtoRestUnion[T] {
    return config as unknown as CollectionDtoRestUnion[T];
  }

  async getCollectionByVertexId<T extends keyof CollectionDtoUnion>(
    type: T,
    vertexId: string,
  ) {
    try {
      return this.collectionRepository
        .getCollectionByVertexId(type, vertexId)
        .then((collection) => this.processForPointers(type, collection));
    } catch (error) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
  }

  private async processForPointers<T extends keyof CollectionDtoUnion>(
    type: T,
    collection: CollectionDtoUnion[T],
  ) {
    if (type === 'serviceInstance') {
      const serviceInstance: ServiceInstanceDto = collection;
      if (serviceInstance.action) {
        await this.joinIntention(serviceInstance.action);
      }
    }
    return collection;
  }

  async searchCollection<T extends keyof CollectionDtoUnion>(
    type: T,
    q: string | undefined,
    upstreamVertex: string | undefined,
    id: string | undefined,
    vertexId: string | undefined,
    offset: number,
    limit: number,
  ) {
    let vertexIds = vertexId ? [vertexId] : undefined;
    if (q) {
      const typeaheadData = await this.graphRepository.vertexTypeahead(
        q,
        [type],
        0,
        PERSISTENCE_TYPEAHEAD_SUBQUERY_LIMIT,
      );
      vertexIds = typeaheadData.data.map((data) => data.id);
    }
    return this.collectionRepository.searchCollection(
      type,
      upstreamVertex,
      id,
      vertexIds,
      offset,
      limit,
    );
  }

  async exportCollection<T extends keyof CollectionDtoUnion>(
    type: T,
    fields: string[],
  ) {
    const data = await this.collectionRepository.exportCollection(type);
    if (!fields) {
      return data;
    } else {
      return data.map((dto) =>
        Object.fromEntries(
          Object.entries(dto).filter(([key]) => fields.indexOf(key) !== -1),
        ),
      );
    }
  }

  private async joinIntention(
    pointer: IntentionActionPointerRestDto[] | IntentionActionPointerRestDto,
  ) {
    const actionPointers = Array.isArray(pointer) ? pointer : [pointer];
    for (const actionPointer of actionPointers) {
      // console.log(actionPointer);
      if (actionPointer.intention) {
        const intention = await this.intentionService.getIntention(
          actionPointer.intention,
        );
        if (intention) {
          // console.log(this.actionUtil.actionToOptions(actionPointer.action));
          const actions = this.actionUtil.filterActions(
            intention.actions,
            this.actionUtil.actionToOptions(actionPointer.action),
          );
          actionPointer.source = {
            intention,
            action: actions.length === 1 ? actions[0] : undefined,
          };
        }
      }
    }
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

  async doUniqueKeyCheck(
    collection: keyof CollectionDtoUnion,
    key: string,
    value: string,
  ) {
    return this.collectionRepository.doUniqueKeyCheck(collection, key, value);
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
