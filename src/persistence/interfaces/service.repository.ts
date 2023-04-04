import { ServiceDto } from '../dto/service.dto';

export abstract class ServiceRepository {
  public abstract getServiceByVertexId(id: string): Promise<ServiceDto>;
}
