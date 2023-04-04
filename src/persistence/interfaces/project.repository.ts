import { ProjectDto } from '../dto/project.dto';

export abstract class ProjectRepository {
  public abstract getProjectByVertexId(id: string): Promise<ProjectDto>;
}
