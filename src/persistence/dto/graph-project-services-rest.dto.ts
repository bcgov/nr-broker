import { ProjectRestDto } from './project-rest.dto';
import { ServiceRestDto } from './service-rest.dto';

export class GraphProjectServicesResponseDto extends ProjectRestDto {
  services: ServiceRestDto | { env: string[] }[];
}
