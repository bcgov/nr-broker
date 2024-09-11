import { Injectable, NotFoundException } from '@nestjs/common';
import { catchError, firstValueFrom, of } from 'rxjs';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { CollectionDtoUnion } from '../persistence/dto/collection-dto-union.type';
import { TokenService } from '../token/token.service';
import { ProjectDto } from '../persistence/dto/project.dto';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { CollectionIndex } from '../graph/graph.constants';
import { REDIS_PUBSUB, VAULT_ADDR } from '../constants';
import { ServiceInstanceDto } from '../persistence/dto/service-instance.dto';
import { ActionUtil } from '../util/action.util';
import { CollectionConfigRestDto } from '../persistence/dto/collection-config-rest.dto';
import { IntentionService } from '../intention/intention.service';
import { PERSISTENCE_TYPEAHEAD_SUBQUERY_LIMIT } from '../persistence/persistence.constants';
import { RedisService } from '../redis/redis.service';
import { IntentionActionPointerDto } from '../persistence/dto/intention-action-pointer.dto';
import { BuildRepository } from '../persistence/interfaces/build.repository';
import { CollectionComboRestDto } from '../persistence/dto/collection-combo-rest.dto';

@Injectable()
export class CollectionService {
  constructor(
    private readonly buildRepository: BuildRepository,
    private readonly collectionRepository: CollectionRepository,
    private readonly graphRepository: GraphRepository,
    private readonly intentionService: IntentionService,
    private readonly actionUtil: ActionUtil,
    private readonly tokenService: TokenService,
    private readonly redisService: RedisService,
  ) {}

  public async getCollectionConfig(): Promise<CollectionConfigRestDto[]> {
    return this.collectionRepository.getCollectionConfigs() as unknown as Promise<
      CollectionConfigRestDto[]
    >;
  }

  public async getCollectionConfigByName(
    collection: keyof CollectionDtoUnion,
  ): Promise<CollectionConfigRestDto | null> {
    return this.collectionRepository.getCollectionConfigByName(
      collection,
    ) as unknown as Promise<CollectionConfigRestDto | null>;
  }

  async getCollectionById<T extends keyof CollectionDtoUnion>(
    type: T,
    id: string,
  ) {
    try {
      return await this.collectionRepository
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

  async getCollectionComboById<T extends keyof CollectionDtoUnion>(
    type: T,
    id: string,
  ): Promise<CollectionComboRestDto<T>> {
    const collection = await this.getCollectionById(type, id);
    if (!collection) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
    const [vertex, connections] = await Promise.all([
      this.graphRepository.getVertex(collection.vertex.toString()),
      this.graphRepository.getVertexConnections(collection.vertex.toString()),
    ]);

    return {
      type: 'vertex',
      collection,
      vertex,
      ...connections,
    } as unknown as CollectionComboRestDto<T>;
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
      const serviceInstance = collection as ServiceInstanceDto;
      if (serviceInstance.action && serviceInstance.action.intention) {
        await this.joinIntention(serviceInstance.action);
      }
    }
    return collection;
  }

  async addTagToCollectionById<T extends keyof CollectionDtoUnion>(
    type: T,
    id: string,
    tag: string,
  ) {
    try {
      const collection = await this.getCollectionById(type, id);
      const sanitizedTag = this.sanitizeTag(tag);
      if (!collection.tags) {
        collection.tags = [];
      }
      if (!collection.tags.includes(sanitizedTag)) {
        collection.tags.push(sanitizedTag);
      } else {
        return collection.tags;
      }
      await this.collectionRepository.saveTags(type, id, collection.tags);
      return collection.tags;
    } catch (error) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
  }

  async setTagsOnCollection<T extends keyof CollectionDtoUnion>(
    type: T,
    id: string,
    tags: string[],
  ) {
    try {
      const collection = await this.getCollectionById(type, id);
      const sanitizedTags = tags.map((tag) => this.sanitizeTag(tag));
      await this.collectionRepository.saveTags(type, id, sanitizedTags);
      this.redisService.publish(REDIS_PUBSUB.GRAPH, {
        data: {
          event: 'collection-edit',
          collection: { id, vertex: collection.vertex.toString() },
        },
      });
      return tags;
    } catch (error) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
  }

  async deleteTagFromCollectionById<T extends keyof CollectionDtoUnion>(
    type: T,
    id: string,
    tag: string,
  ) {
    try {
      const collection = await this.getCollectionById(type, id);
      const sanitizedTag = this.sanitizeTag(tag);
      if (!collection.tags) {
        collection.tags = [];
      }

      const index = collection.tags.indexOf(sanitizedTag);
      if (index === -1) {
        return collection.tags;
      }
      if (index > -1) {
        collection.tags.splice(index, 1);
      }
      await this.collectionRepository.saveTags(type, id, collection.tags);
      return collection.tags;
    } catch (error) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
  }

  private sanitizeTag(tag: string): string {
    return tag.trim();
  }

  async searchCollection<T extends keyof CollectionDtoUnion>(
    type: T,
    q: string | undefined,
    tags: string[] | undefined,
    upstreamVertex: string | undefined,
    downstreamVertex: string | undefined,
    id: string | undefined,
    vertexId: string | undefined,
    sort: string | undefined,
    dir: string | undefined,
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
      tags,
      upstreamVertex,
      downstreamVertex,
      id,
      vertexIds,
      sort,
      dir,
      offset,
      limit,
    );
  }

  async getCollectionTags<T extends keyof CollectionDtoUnion>(type: T) {
    return (await this.collectionRepository.getCollectionTags(type))
      .filter((val) => !!val)
      .sort();
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
    pointer: IntentionActionPointerDto[] | IntentionActionPointerDto,
  ) {
    const actionPointers = Array.isArray(pointer) ? pointer : [pointer];
    for (const actionPointer of actionPointers) {
      if (actionPointer.intention) {
        const intention = await this.intentionService.getIntention(
          actionPointer.intention.toString(),
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

  async getServiceDetails(serviceId: string) {
    const service = await this.graphRepository.getServiceDetails(serviceId);
    const builds = await this.buildRepository.searchBuild(serviceId, 0, 5);
    if (!service) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not Found',
        error: `Check service exists: ${serviceId}`,
      });
    }
    for (const instance of service.serviceInstance) {
      if (instance?.action?.source) {
        instance.action.source.intention.auditUrl =
          this.actionUtil.auditUrlForIntention(
            instance.action.source.intention,
          );
      }
    }
    return {
      ...service,
      builds,
    };
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
    const envs = await this.collectionRepository.getCollections('environment');
    const project = vertices[0].collection;
    const roleInfo = await Promise.all(
      envs.map((env) =>
        this.getAppRoleInfoForApplicationSuppressed(
          project.name,
          service.name,
          env.name,
        ),
      ),
    );

    return {
      api: VAULT_ADDR,
      appRole: envs.map((env, i) => ({
        enabled: !!roleInfo[i],
        env,
        info: roleInfo[i],
      })),
    };
  }

  async doUniqueKeyCheck(
    collection: keyof CollectionDtoUnion,
    key: string,
    value: string,
  ) {
    return this.collectionRepository.doUniqueKeyCheck(collection, key, value);
  }

  private async getAppRoleInfoForApplicationSuppressed(
    projectName: string,
    serviceName: string,
    environment: string,
  ): Promise<any | null> {
    return firstValueFrom(
      this.tokenService
        .getAppRoleInfoForApplication(projectName, serviceName, environment)
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
