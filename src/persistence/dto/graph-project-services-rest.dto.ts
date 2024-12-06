import { ProjectDto } from './project.dto';
import { ServiceDto } from './service.dto';

export class GraphProjectServicesResponseDto extends ProjectDto {
  services!: (ServiceDto & { env: string[]; shortEnv: string[] })[];
}
