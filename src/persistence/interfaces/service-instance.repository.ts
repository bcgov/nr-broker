import { ServiceInstanceDto } from '../dto/service-instance.dto';

export abstract class ServiceInstanceRepository {
  public abstract getServiceInstanceByVertexId(
    id: string,
  ): Promise<ServiceInstanceDto>;
}
