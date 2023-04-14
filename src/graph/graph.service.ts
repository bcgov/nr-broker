import { Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class GraphService {
  constructor(
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

  public async addEdge(edge: EdgeDto): Promise<boolean> {
    return this.graphRepository.addEdge(edge);
  }

  public async getEdge(id: string): Promise<EdgeDto> {
    try {
      return this.graphRepository.getEdge(id);
    } catch (error) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
  }

  public async deleteEdge(id: string): Promise<boolean> {
    try {
      return this.graphRepository.deleteEdge(id);
    } catch (error) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
  }

  public async addVertex(vertex: VertexDto): Promise<boolean> {
    try {
      return this.addVertex(vertex);
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
      return this.graphRepository.getVertex(id);
    } catch (error) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Not found',
        error: '',
      });
    }
  }

  public async deleteVertex(id: string): Promise<boolean> {
    try {
      return this.graphRepository.deleteVertex(id);
    } catch (error) {
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
