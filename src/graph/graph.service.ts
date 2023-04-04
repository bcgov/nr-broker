import { Injectable } from '@nestjs/common';
import { ProjectDto } from '../persistence/dto/project.dto';
import { ProjectRepository } from '../persistence/interfaces/project.repository';
import { ServiceRepository } from '../persistence/interfaces/service.repository';
import { EnvironmentRepository } from '../persistence/interfaces/environment.repository';
import { ServiceInstanceRepository } from '../persistence/interfaces/service-instance.repository';
import { GraphRepository } from '../persistence/interfaces/graph.repository';

@Injectable()
export class GraphService {
  constructor(
    private readonly graphRepository: GraphRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly serviceInstanceRepository: ServiceInstanceRepository,
  ) {}

  public async getData(): Promise<string> {
    return this.graphRepository.getData(true);
  }

  public async getEnvironmentByVertexId(id: string): Promise<ProjectDto> {
    return this.environmentRepository.getEnvironmentByVertexId(id);
  }

  public async getProjectByVertexId(id: string): Promise<ProjectDto> {
    return this.projectRepository.getProjectByVertexId(id);
  }

  public async getServiceByVertexId(id: string): Promise<ProjectDto> {
    return this.serviceRepository.getServiceByVertexId(id);
  }

  public async getServiceInstanceByVertexId(id: string): Promise<ProjectDto> {
    return this.serviceInstanceRepository.getServiceInstanceByVertexId(id);
  }
}
