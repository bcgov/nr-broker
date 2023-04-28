import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { VertexDto } from '../persistence/dto/vertex.dto';
import { EdgeDto } from '../persistence/dto/edge.dto';
import { AuditService } from '../audit/audit.service';
import { Request } from 'express';
import {
  GraphDataResponseDto,
  GraphDataResponseEdgeDto,
} from '../persistence/dto/graph-data.dto';
import { VertexInsertDto } from '../persistence/dto/vertex-rest.dto';

@Injectable()
export class GraphService {
  constructor(
    private readonly auditService: AuditService,
    private readonly graphRepository: GraphRepository,
  ) {}

  public async getData(
    includeCollection: boolean,
  ): Promise<GraphDataResponseDto> {
    return this.graphRepository.getData(includeCollection);
  }

  public async addEdge(
    req: Request,
    edge: EdgeDto,
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
    vertex: VertexInsertDto,
    ignorePermissions = false,
  ): Promise<VertexDto> {
    try {
      const resp = await this.graphRepository.addVertex(
        vertex,
        ignorePermissions,
      );
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
    vertex: VertexInsertDto,
  ): Promise<VertexDto> {
    try {
      this.auditService.recordGraphAction(
        req,
        'graph-vertex-edit',
        null,
        'success',
      );
      return this.graphRepository.editVertex(id, vertex);
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
}
