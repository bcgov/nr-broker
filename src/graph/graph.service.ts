import { Injectable } from '@nestjs/common';
import { ProjectDto } from '../persistence/dto/project.dto';
import { ProjectRepository } from '../persistence/interfaces/project.repository';
import { ServiceRepository } from '../persistence/interfaces/service.repository';
import { EnvironmentRepository } from '../persistence/interfaces/environment.repository';
import { ServiceInstanceRepository } from '../persistence/interfaces/service-instance.repository';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { EnvironmentDto } from '../persistence/dto/environment.dto';
import { ServiceInstanceDto } from '../persistence/dto/service-instance.dto';
import { ServiceDto } from '../persistence/dto/service.dto';

@Injectable()
export class GraphService {
  constructor(
    private readonly environmentRepository: EnvironmentRepository,
    private readonly graphRepository: GraphRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly serviceInstanceRepository: ServiceInstanceRepository,
  ) {}

  public async getData(includeCollection: boolean): Promise<string> {
    return this.graphRepository.getData(includeCollection);
  }

  public async getEnvironmentByVertexId(id: string): Promise<EnvironmentDto> {
    return this.environmentRepository.getEnvironmentByVertexId(id);
  }

  public async getProjectByVertexId(id: string): Promise<ProjectDto> {
    return this.projectRepository.getProjectByVertexId(id);
  }

  public async getServiceByVertexId(id: string): Promise<ServiceDto> {
    return this.serviceRepository.getServiceByVertexId(id);
  }

  public async getServiceInstanceByVertexId(
    id: string,
  ): Promise<ServiceInstanceDto> {
    return this.serviceInstanceRepository.getServiceInstanceByVertexId(id);
  }
}
