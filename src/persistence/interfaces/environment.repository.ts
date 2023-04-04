import { EnvironmentDto } from '../dto/environment.dto';

export abstract class EnvironmentRepository {
  public abstract getEnvironmentByVertexId(id: string): Promise<EnvironmentDto>;
}
