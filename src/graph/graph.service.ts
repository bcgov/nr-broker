import {
  BadRequestException,
  Injectable,
  MessageEvent,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import ejs from 'ejs';
import { ValidationError, wrap } from '@mikro-orm/core';
import { get, set } from 'lodash';
import { validate } from 'class-validator';

import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { VertexEntity } from '../persistence/entity/vertex.entity';
import { AuditService } from '../audit/audit.service';
import {
  GraphDataResponseDto,
  GraphDeleteResponseDto,
} from '../persistence/dto/graph-data.dto';
import { VertexInsertDto } from '../persistence/dto/vertex.dto';
import { EdgeInsertDto, EdgeDto } from '../persistence/dto/edge.dto';
import { EdgeEntity } from '../persistence/entity/edge.entity';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import {
  CollectionDtoUnion,
  CollectionNameEnum,
  CollectionNames,
} from '../persistence/dto/collection-dto-union.type';
import { CollectionConfigEntity } from '../persistence/entity/collection-config.entity';
import { GraphTypeaheadResult } from './dto/graph-typeahead-result.dto';
import { CollectionConfigInstanceDto } from '../persistence/dto/collection-config.dto';
import { REDIS_PUBSUB } from '../constants';
import { RedisService } from '../redis/redis.service';
import { UserPermissionNames } from '../persistence/dto/user-permission.dto';
import { AuthService } from '../auth/auth.service';
import { ServiceInstanceDto } from '../persistence/dto/service-instance.dto';
import { EnvironmentDto } from '../persistence/dto/environment.dto';
import { CollectionEntityUnion } from '../persistence/entity/collection-entity-union.type';
import { ValidatorUtil } from '../util/validator.util';

@Injectable()
export class GraphService {
  constructor(
    private readonly auditService: AuditService,
    private readonly authSerivice: AuthService,
    private readonly collectionRepository: CollectionRepository,
    private readonly graphRepository: GraphRepository,
    private readonly redisService: RedisService,
    private readonly validatorUtil: ValidatorUtil,
  ) {}

  public async getData(
    includeCollection: boolean,
  ): Promise<GraphDataResponseDto> {
    return this.graphRepository.getData(includeCollection);
  }

  public async getDataSlice(
    collections: string[],
  ): Promise<GraphDataResponseDto> {
    return this.graphRepository.getDataSlice(collections);
  }

  public async getProjectServices() {
    return this.graphRepository.getProjectServices();
  }

  public async getServerInstalls() {
    return this.graphRepository.getServerInstalls();
  }

  public async getUserPermissions(request: Request) {
    const user = await this.authSerivice.getUser(request);
    return this.graphRepository.getUserPermissions(user.vertex.toString());
  }

  public async addEdge(req: Request, edge: EdgeInsertDto): Promise<EdgeDto> {
    try {
      const resp = await this.graphRepository.addEdge(edge);
      this.auditService.recordGraphAction(
        req,
        'graph-edge-add',
        null,
        'success',
        'edge',
        resp,
      );
      this.publishGraphEvent({
        data: { event: 'edge-add', edge: resp.toEdgeResponse() },
      });
      return resp.toEdgeResponse();
    } catch (e) {
      this.auditService.recordGraphAction(
        req,
        'graph-edge-add',
        null,
        'failure',
        'edge',
        edge,
      );
      throw new BadRequestException({
        statusCode: 400,
        message: 'Bad request',
        error:
          e instanceof Error || e instanceof ValidationError ? e.message : '',
      });
    }
  }

  public async editEdge(
    req: Request,
    id: string,
    edge: EdgeInsertDto,
  ): Promise<EdgeDto> {
    try {
      const resp = await this.graphRepository.editEdge(id, edge);
      this.auditService.recordGraphAction(
        req,
        'graph-edge-edit',
        null,
        'success',
        'edge',
        resp,
      );
      this.publishGraphEvent({
        data: { event: 'edge-edit', edge: resp.toEdgeResponse() },
      });
      return resp.toEdgeResponse();
    } catch (e) {
      this.auditService.recordGraphAction(
        req,
        'graph-edge-edit',
        null,
        'failure',
        'edge',
        edge,
      );
      throw new BadRequestException({
        statusCode: 400,
        message: 'Bad request',
        error: '',
      });
    }
  }

  public async getEdge(id: string): Promise<EdgeDto> {
    try {
      const edge = await this.graphRepository.getEdge(id);
      if (edge === null) {
        throw new Error();
      }
      return edge.toEdgeResponse();
    } catch (error) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
  }

  public async deleteEdge(
    req: Request,
    id: string,
  ): Promise<GraphDeleteResponseDto> {
    try {
      const resp = await this.graphRepository.deleteEdge(id);
      this.auditService.recordGraphAction(
        req,
        'graph-edge-delete',
        null,
        'success',
        'edge',
        id,
      );

      this.publishGraphEvent({
        data: { event: 'edge-delete', ...resp },
      });
      return resp;
    } catch (error) {
      this.auditService.recordGraphAction(
        req,
        'graph-edge-delete',
        null,
        'failure',
        'edge',
        id,
      );
      throw new BadRequestException({
        statusCode: 400,
        message: 'Bad request',
        error: '',
      });
    }
  }

  public async addVertex(
    req: Request,
    vertexInsert: VertexInsertDto,
    ignorePermissions = false,
  ): Promise<VertexEntity> {
    const [vertex, collection, config] = await this.validateVertex(
      vertexInsert,
      ignorePermissions ? false : 'create',
    );
    for (const [key, field] of Object.entries(config.fields)) {
      if (field.unique) {
        const uniqueCheck = await this.collectionRepository.doUniqueKeyCheck(
          vertex.collection,
          key,
          collection[key],
        );
        if (uniqueCheck.length > 0) {
          throw new BadRequestException({
            statusCode: 400,
            message: 'Bad request',
            error: `${key} is not unique`,
          });
        }
      }
    }
    try {
      const resp = await this.graphRepository.addVertex(vertex, collection);
      this.auditService.recordGraphAction(
        req,
        'graph-vertex-add',
        null,
        'success',
        'vertex',
        resp,
      );
      this.publishGraphEvent({
        data: {
          event: 'vertex-add',
          vertex: {
            category: CollectionNameEnum[resp.collection],
            index: config.index,
            ...wrap(resp).toJSON(),
          },
        },
      });
      return resp;
    } catch (e) {
      this.auditService.recordGraphAction(
        req,
        'graph-vertex-add',
        null,
        'failure',
        'vertex',
        vertexInsert,
      );
      throw new BadRequestException({
        statusCode: 400,
        message: 'Bad request',
        error:
          e instanceof Error || e instanceof ValidationError ? e.message : '',
      });
    }
  }

  public async editVertex(
    req: Request,
    id: string,
    vertexInsert: VertexInsertDto,
    ignorePermissions = false,
    ignoreBlankFields = false,
  ): Promise<VertexEntity> {
    // eslint-disable-next-line prefer-const
    let [vertex, collection, config] = await this.validateVertex(
      vertexInsert,
      ignorePermissions ? false : 'update',
    );
    // console.log(vertex);
    // console.log(collection);
    const vertexObj = await this.collectionRepository.getCollectionByVertexId(
      vertexInsert.collection,
      id,
    );
    if (!vertexObj) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Invalid vertex id',
        error: `Collection (${vertexInsert.collection}) object with vertex (${id}) does not exist`,
      });
    }
    // console.log((req.user as any)?.mask);
    // Owners can edit vertices but, priviledged fields must be masked
    if (req && (req?.user as any)?.mask) {
      this.maskCollectionFields(
        (req.user as any).mask,
        config,
        collection,
        vertexObj,
      );
      vertex = this.mapCollectionToVertex(config, vertex, collection);
    }
    for (const [key, field] of Object.entries(config.fields)) {
      if (field.unique) {
        const uniqueCheck = await this.collectionRepository.doUniqueKeyCheck(
          vertex.collection,
          key,
          collection[key],
        );
        // console.log(vertex);
        // console.log(collection);
        // console.log(uniqueCheck);
        if (
          uniqueCheck.filter((check) => vertexObj.id.toString() !== check)
            .length > 0
        ) {
          throw new BadRequestException({
            statusCode: 400,
            message: 'Bad request',
            error: `${key} is not unique`,
          });
        }
      }
    }
    try {
      const resp = await this.graphRepository.editVertex(
        id,
        vertex,
        collection,
        ignoreBlankFields,
      );

      this.auditService.recordGraphAction(
        req,
        'graph-vertex-edit',
        null,
        'success',
        'vertex',
        resp,
      );
      this.publishGraphEvent({
        data: {
          event: 'vertex-edit',
          vertex: {
            category: CollectionNameEnum[resp.collection],
            index: config.index,
            ...wrap(resp).toJSON(),
          },
        },
      });

      return resp;
    } catch (error) {
      this.auditService.recordGraphAction(
        req,
        'graph-vertex-edit',
        null,
        'failure',
        'vertex',
        vertexInsert,
      );
      throw new BadRequestException({
        statusCode: 400,
        message: 'Bad request',
        error: '',
      });
    }
  }

  private async validateVertex(
    vertexInsert: VertexInsertDto,
    checkPermission: false | 'update' | 'create',
  ): Promise<
    [
      vertex: VertexEntity,
      collection: CollectionEntityUnion[typeof vertexInsert.collection],
      config: CollectionConfigEntity,
    ]
  > {
    let vertex = VertexEntity.upgradeInsertDto(vertexInsert);
    const config = await this.collectionRepository.getCollectionConfigByName(
      vertexInsert.collection,
    );

    if (!config) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Invalid collection name',
        error: `Collection config with name (${vertexInsert.collection}) does not exist`,
      });
    }

    // for (const [key, field] of Object.entries(config.fields)) {
    //   if (field.type === 'date' && vertexInsert.data[key]) {
    //     vertexInsert.data[key] = new Date(
    //       vertexInsert.data[key].split('T')[0] + 'T00:00:00.000Z',
    //     );
    //   }
    // }
    console.log(vertexInsert);
    const errors = await validate(vertexInsert, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    });
    if (errors.length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Collection validation error',
        error: this.validatorUtil.buildFirstFailedPropertyErrorMsg(errors[0]),
      });
    }

    const collection = this.collectionRepository.assignCollection(
      vertexInsert.collection,
      vertexInsert.data,
    );
    if (!collection) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'No data',
      });
    }

    if (
      checkPermission &&
      (config === null || !config.permissions[checkPermission])
    ) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Permission error',
        error: `The collection '${vertex.collection}' does not allow the action '${checkPermission}'`,
      });
    }

    vertex = this.mapCollectionToVertex(config, vertex, collection);
    // const vertexErrors = await validate(vertex, {
    //   whitelist: true,
    //   forbidNonWhitelisted: true,
    //   forbidUnknownValues: true,
    // });
    // if (vertexErrors.length > 0) {
    //   throw new BadRequestException({
    //     statusCode: 400,
    //     message: 'Vertex validation error',
    //     error: this.validatorUtil.buildFirstFailedPropertyErrorMsg(
    //       vertexErrors[0],
    //     ),
    //   });
    // }

    return [vertex, collection, config];
  }

  private async maskCollectionFields(
    maskType: UserPermissionNames,
    config: CollectionConfigEntity,
    newCollection: any,
    oldCollection: any,
  ) {
    // console.log(newCollection);
    // console.log(oldCollection);

    for (const [key, field] of Object.entries(config.fields)) {
      if (!field.mask || !field.mask[maskType]) {
        if (newCollection[key] !== undefined) {
          delete newCollection[key];
        }
        if (oldCollection[key]) {
          newCollection[key] = oldCollection[key];
        }
        continue;
      }
      const mask = field.mask[maskType];
      if (field.type === 'embeddedDoc' && Array.isArray(mask)) {
        let maskedValues = JSON.parse(JSON.stringify(oldCollection[key] ?? {}));
        // console.log(maskedValues);
        for (const path of mask) {
          const val = get(newCollection[key], path);
          // console.log(`${path}: ${val}`);
          if (val !== undefined) {
            maskedValues = set(maskedValues, path, val);
          }
        }
        // console.log(maskedValues);
        newCollection[key] = maskedValues;
      }
    }

    // console.log(newCollection);
  }

  private mapCollectionToVertex(
    config: CollectionConfigEntity,
    vertex: VertexEntity,
    collection: CollectionEntityUnion[typeof vertex.collection],
  ) {
    for (const map of config.collectionMapper) {
      vertex = set(vertex, map.setPath, get(collection, map.getPath));
    }
    return vertex;
  }

  public async upsertVertex(
    req: Request,
    vertexInsert: VertexInsertDto,
    targetBy: 'id' | 'parentId' | 'name',
    target: string | null = null,
  ): Promise<VertexEntity> {
    const vertex = VertexEntity.upgradeInsertDto(vertexInsert);

    if (targetBy === 'id') {
      return this.editVertex(req, target, vertexInsert, true, true);
    } else if (targetBy === 'parentId') {
      const config = await this.collectionRepository.getCollectionConfigByName(
        vertex.collection,
      );
      const mappedVertex = this.mapCollectionToVertex(
        config,
        vertex,
        vertexInsert.data,
      );
      // Must have name set
      if (!mappedVertex.name) {
        throw new Error();
      }

      const curVertex = await this.graphRepository.getVertexByParentIdAndName(
        vertex.collection,
        target,
        mappedVertex.name,
      );
      if (curVertex) {
        return this.editVertex(
          req,
          curVertex.id.toString(),
          vertexInsert,
          true,
          true,
        );
      } else {
        return this.addVertex(req, vertexInsert, true);
      }
    } else if (targetBy === 'name') {
      const config = await this.collectionRepository.getCollectionConfigByName(
        vertex.collection,
      );
      // Must be unique name
      if (
        !config.fields[config.collectionVertexName] ||
        !config.fields[config.collectionVertexName].unique
      ) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'Bad request',
          error: 'Upsert vertex must be identified by unique field',
        });
      }
      const mappedVertex = this.mapCollectionToVertex(
        config,
        vertex,
        vertexInsert.data,
      );
      // Must have name set
      if (!mappedVertex.name) {
        throw new Error();
      }
      const curVertex = await this.graphRepository.getVertexByName(
        vertex.collection,
        mappedVertex.name,
      );
      if (curVertex) {
        return this.editVertex(
          req,
          curVertex.id.toString(),
          vertexInsert,
          true,
          true,
        );
      } else {
        return this.addVertex(req, vertexInsert, true);
      }
    }
  }

  public async getEdgeByNameAndVertices(
    name: string,
    source: string,
    target: string,
  ): Promise<EdgeEntity> {
    try {
      const edge = await this.graphRepository.getEdgeByNameAndVertices(
        name,
        source,
        target,
      );
      if (edge === null) {
        throw new Error();
      }
      return edge;
    } catch (error) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
  }

  public async searchEdgesShallow(
    name: string,
    map: 'id' | 'source' | 'target' | '',
    source?: string,
    target?: string,
  ): Promise<string[] | EdgeEntity[]> {
    const results = await this.graphRepository.searchEdgesShallow(
      name,
      source,
      target,
    );
    if (map !== '') {
      return results.map((edge) => get(edge, map).toString());
    }
    return results;
  }

  public async getVertex(id: string): Promise<VertexEntity> {
    try {
      const vertex = await this.graphRepository.getVertex(id);
      if (vertex === null) {
        throw new Error();
      }
      return vertex;
    } catch (error) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
  }

  async searchVertex(
    collection: keyof CollectionDtoUnion,
    edgeName?: string,
    edgeTarget?: string,
  ) {
    if (CollectionNameEnum[collection] === undefined) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Bad request',
        error: '',
      });
    }
    if ((edgeName === undefined) !== (edgeTarget === undefined)) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Bad request',
        error: '',
      });
    }
    try {
      const results = await this.graphRepository.searchVertex(
        collection,
        edgeName,
        edgeTarget,
      );
      return results;
    } catch (error) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
  }

  public async connectedVertex(request: Request) {
    const user = await this.authSerivice.getUser(request);
    return this.graphRepository.getUserConnectedVertex(user.vertex.toString());
  }

  public async deleteVertex(
    req: Request,
    id: string,
  ): Promise<GraphDeleteResponseDto> {
    try {
      const resp = await this.graphRepository.deleteVertex(id);
      this.auditService.recordGraphAction(
        req,
        'graph-vertex-delete',
        null,
        'success',
        'vertex',
        id,
      );

      this.publishGraphEvent({
        data: { event: 'vertex-delete', ...resp },
      });
      return resp;
    } catch (error) {
      this.auditService.recordGraphAction(
        req,
        'graph-vertex-delete',
        null,
        'failure',
        'vertex',
        id,
      );
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
  }

  async getUpstreamVertex(
    id: string,
    index: number,
    matchEdgeNames: string[] | null,
  ) {
    return this.graphRepository.getUpstreamVertex(id, index, matchEdgeNames);
  }

  public async vertexTypeahead(
    text: string,
    collections?: CollectionNames[],
    offset?: number,
    limit?: number,
  ): Promise<GraphTypeaheadResult> {
    return this.graphRepository.vertexTypeahead(
      text,
      collections,
      offset,
      limit,
    );
  }

  public async reindexCache() {
    return this.graphRepository.reindexCache();
  }

  public async getEdgeConfigByVertex(
    id: string,
    targetCollection?: string,
    edgeName?: string,
  ) {
    try {
      return (await this.graphRepository
        .getEdgeConfigByVertex(id, targetCollection, edgeName)
        .then(async (response) => {
          const converted =
            response as unknown as CollectionConfigInstanceDto[];
          for (const ccInstance of converted) {
            if (ccInstance.edge.prototype.url && ccInstance.instance) {
              ccInstance.links = {
                default: '',
              };
              if (ccInstance.edge.collection === 'service') {
                const ds =
                  await this.graphRepository.getDownstreamVertex<ServiceInstanceDto>(
                    ccInstance.instance.target,
                    CollectionNameEnum.serviceInstance,
                    2,
                  );
                if (ds.length > 0) {
                  ccInstance.links.alt = [];
                  let position = 0;
                  for (const serviceInstance of ds) {
                    const environment =
                      await this.graphRepository.getDownstreamVertex<EnvironmentDto>(
                        serviceInstance.collection.vertex.toString(),
                        CollectionNameEnum.environment,
                        1,
                      );
                    if (environment.length === 0) {
                      continue;
                    }
                    const url = ejs.render(ccInstance.edge.prototype.url, {
                      property: ccInstance.instance?.prop ?? {},
                      url: serviceInstance.collection.url,
                    });

                    ccInstance.links.alt.push({
                      environmentPosition: environment[0].collection.position,
                      environmentTitle: environment[0].collection.title,
                      name: serviceInstance.collection.name,
                      url,
                    });

                    if (
                      ccInstance.links.default === '' ||
                      environment[0].collection.position < position
                    ) {
                      ccInstance.links.default = url;
                      position = environment[0].collection.position;
                    }
                  }
                }
              } else {
                ccInstance.links = {
                  default: ejs.render(ccInstance.edge.prototype.url, {
                    property: ccInstance.instance?.prop ?? {},
                  }),
                };
              }
            }
          }
          return response;
        })) as unknown as CollectionConfigInstanceDto[];
    } catch (error) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
  }

  private publishGraphEvent(event: MessageEvent) {
    this.redisService.publish(REDIS_PUBSUB.GRAPH, event);
  }
}
