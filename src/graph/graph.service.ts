import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectDto } from '../persistence/dto/project.dto';
import { ProjectRepository } from '../persistence/interfaces/project.repository';
import { ServiceRepository } from '../persistence/interfaces/service.repository';
import { EnvironmentRepository } from '../persistence/interfaces/environment.repository';
import { ServiceInstanceRepository } from '../persistence/interfaces/service-instance.repository';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { EnvironmentDto } from '../persistence/dto/environment.dto';
import { ServiceInstanceDto } from '../persistence/dto/service-instance.dto';
import { ServiceDto } from '../persistence/dto/service.dto';
import { VertexDto } from '../persistence/dto/vertex.dto';
import { EdgeDto } from '../persistence/dto/edge.dto';
import { CollectionConfigRepository } from '../persistence/interfaces/collection-config.repository';
import { CollectionConfigDto } from '../persistence/dto/collection-config.dto';
import { AuditService } from '../audit/audit.service';
import { Request } from 'express';

@Injectable()
export class GraphService {
  constructor(
    private readonly auditService: AuditService,
    private readonly collectionConfigRepository: CollectionConfigRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly graphRepository: GraphRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly serviceInstanceRepository: ServiceInstanceRepository,
  ) {}

  public async getData(includeCollection: boolean): Promise<string> {
    return this.graphRepository.getData(includeCollection);
  }

  public async getCollectionConfig(): Promise<CollectionConfigDto[]> {
    return this.collectionConfigRepository.getAll();
  }

  public async addEdge(req: Request, edge: EdgeDto): Promise<EdgeDto> {
    try {
      const resp = await this.graphRepository.addEdge(edge);
      this.auditService.recordGraphAction(
        req,
        'graph-edge-add',
        null,
        'success',
      );
      return resp;
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

  public async getEdge(id: string): Promise<EdgeDto> {
    try {
      const edge = await this.graphRepository.getEdge(id);
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

  public async addVertex(req: Request, vertex: VertexDto): Promise<VertexDto> {
    try {
      const resp = await this.graphRepository.addVertex(vertex);
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
    vertex: VertexDto,
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

  public async getEnvironmentByVertexId(id: string): Promise<EnvironmentDto> {
    try {
      return this.environmentRepository.getEnvironmentByVertexId(id);
    } catch (error) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
  }

  public async getProjectByVertexId(id: string): Promise<ProjectDto> {
    try {
      return this.projectRepository.getProjectByVertexId(id);
    } catch (error) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
  }

  public async getServiceByVertexId(id: string): Promise<ServiceDto> {
    try {
      return this.serviceRepository.getServiceByVertexId(id);
    } catch (error) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
  }

  public async getServiceInstanceByVertexId(
    id: string,
  ): Promise<ServiceInstanceDto> {
    try {
      return this.serviceInstanceRepository.getServiceInstanceByVertexId(id);
    } catch (error) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
  }
}
