import { EnvironmentRestDto } from './environment-rest.dto';
import { ServiceInstanceRestDto } from './service-instance-rest.dto';
import { ServiceRestDto } from './service-rest.dto';

export class GraphServerInstallInstanceDto extends ServiceInstanceRestDto {
  environment: EnvironmentRestDto;
  service: ServiceRestDto;
}

export class GraphServerInstallsResponseDto extends ServiceInstanceRestDto {
  instances: GraphServerInstallInstanceDto[];
}
