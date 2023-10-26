import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { VertexDto } from '../persistence/dto/vertex.dto';
import { AuditService } from '../audit/audit.service';
import {
  GraphDataResponseDto,
  GraphDataResponseEdgeDto,
} from '../persistence/dto/graph-data.dto';
import { VertexInsertDto } from '../persistence/dto/vertex-rest.dto';
import { EdgeInsertDto } from '../persistence/dto/edge-rest.dto';
import { EdgeDto } from '../persistence/dto/edge.dto';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { CollectionDtoUnion } from '../persistence/dto/collection-dto-union.type';
import { validate } from 'class-validator';
import { ValidatorUtil } from '../util/validator.util';
import { get, set } from 'radash';
import { CollectionConfigDto } from 'src/persistence/dto/collection-config.dto';

@Injectable()
export class GraphService {
  constructor(
    private readonly auditService: AuditService,
    private readonly collectionRepository: CollectionRepository,
    private readonly graphRepository: GraphRepository,
    private readonly validatorUtil: ValidatorUtil,
  ) {}

  public async getData(
    includeCollection: boolean,
  ): Promise<GraphDataResponseDto> {
    return this.graphRepository.getData(includeCollection);
  }

  public async addEdge(
    req: Request,
    edge: EdgeInsertDto,
  ): Promise<GraphDataResponseEdgeDto> {
    try {
      const resp = await this.graphRepository.addEdge(edge);
      this.auditService.recordGraphAction(
        req,
        'graph-edge-add',
        null,
        'success',
      );
      return resp.toEdgeResponse();
    } catch (e) {
      this.auditService.recordGraphAction(
        req,
        'graph-edge-add',
        null,
        'failure',
      );
      throw new BadRequestException({
        statusCode: 400,
        message: 'Bad request',
        error: '',
      });
    }
  }

  public async editEdge(
    req: Request,
    id: string,
    edge: EdgeInsertDto,
  ): Promise<GraphDataResponseEdgeDto> {
    try {
      const resp = await this.graphRepository.editEdge(id, edge);
      this.auditService.recordGraphAction(
        req,
        'graph-edge-edit',
        null,
        'success',
      );
      return resp.toEdgeResponse();
    } catch (e) {
      this.auditService.recordGraphAction(
        req,
        'graph-edge-edit',
        null,
        'failure',
      );
      throw new BadRequestException({
        statusCode: 400,
        message: 'Bad request',
        error: '',
      });
    }
  }

  public async getEdge(id: string): Promise<GraphDataResponseEdgeDto> {
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

  public async deleteEdge(req: Request, id: string): Promise<boolean> {
    try {
      const resp = this.graphRepository.deleteEdge(id);
      this.auditService.recordGraphAction(
        req,
        'graph-edge-delete',
        null,
        'success',
      );
      return resp;
    } catch (error) {
      this.auditService.recordGraphAction(
        req,
        'graph-edge-delete',
        null,
        'failure',
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
  ): Promise<VertexDto> {
    const [vertex, collection] = await this.validateVertex(
      vertexInsert,
      ignorePermissions ? false : 'create',
    );
    try {
      const resp = await this.graphRepository.addVertex(vertex, collection);
      this.auditService.recordGraphAction(
        req,
        'graph-vertex-add',
        null,
        'success',
      );
      return resp;
    } catch (error) {
      this.auditService.recordGraphAction(
        req,
        'graph-vertex-add',
        null,
        'failure',
      );
      throw new BadRequestException({
        statusCode: 400,
        message: 'Bad request',
        error: '',
      });
    }
  }

  public async editVertex(
    req: Request,
    id: string,
    vertexInsert: VertexInsertDto,
    ignorePermissions = false,
  ): Promise<VertexDto> {
    const [vertex, collection] = await this.validateVertex(
      vertexInsert,
      ignorePermissions ? false : 'update',
    );
    try {
      const resp = await this.graphRepository.editVertex(
        id,
        vertex,
        collection,
      );

      this.auditService.recordGraphAction(
        req,
        'graph-vertex-edit',
        null,
        'success',
      );

      return resp;
    } catch (error) {
      this.auditService.recordGraphAction(
        req,
        'graph-vertex-edit',
        null,
        'failure',
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
      vertex: VertexDto,
      collection: CollectionDtoUnion[typeof vertexInsert.collection],
    ]
  > {
    let vertex = VertexDto.upgradeInsertDto(vertexInsert);
    const config = await this.collectionRepository.getCollectionConfigByName(
      vertexInsert.collection,
    );
    const collection = VertexDto.upgradeDataToInstance(vertexInsert);
    const errors = await validate(collection, {
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

    return [vertex, collection];
  }

  private mapCollectionToVertex(
    config: CollectionConfigDto,
    vertex: VertexDto,
    collection: CollectionDtoUnion[typeof vertex.collection],
  ) {
    for (const map of config.collectionMapper) {
      vertex = set(vertex, map.setPath, get(collection, map.getPath));
    }
    return vertex;
  }

  public async upsertVertex(
    vertexInsert: VertexInsertDto,
    targetBy: 'id' | 'parentId' | 'name',
    target: string | null = null,
  ): Promise<VertexDto> {
    const vertex = VertexDto.upgradeInsertDto(vertexInsert);

    if (targetBy === 'id') {
      return this.editVertex(null, target, vertexInsert, true);
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
          null,
          curVertex.id.toString(),
          vertexInsert,
          true,
        );
      } else {
        return this.addVertex(null, vertexInsert, true);
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
          null,
          curVertex.id.toString(),
          vertexInsert,
          true,
        );
      } else {
        return this.addVertex(null, vertexInsert, true);
      }
    }
  }

  public async getEdgeByNameAndVertices(
    name: string,
    sourceId: string,
    targetId: string,
  ): Promise<EdgeDto> {
    try {
      const vertex = await this.graphRepository.getEdgeByNameAndVertices(
        name,
        sourceId,
        targetId,
      );
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

  public async getVertex(id: string): Promise<VertexDto> {
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
    collection: string,
    typeahead?: string,
    edgeName?: string,
    edgeTarget?: string,
  ) {
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
      if (typeahead) {
        const searchString = typeahead.toLowerCase();
        return results.filter((result) =>
          result.name.toLocaleLowerCase().includes(searchString),
        );
      }
      return results;
    } catch (error) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
  }

  public async deleteVertex(req: Request, id: string): Promise<boolean> {
    try {
      const resp = await this.graphRepository.deleteVertex(id);
      this.auditService.recordGraphAction(
        req,
        'graph-vertex-delete',
        null,
        'success',
      );
      return resp;
    } catch (error) {
      this.auditService.recordGraphAction(
        req,
        'graph-vertex-delete',
        null,
        'failure',
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
}
