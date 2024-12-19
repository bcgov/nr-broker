import { EdgePropDto } from './edge-prop.dto';
import { EnvironmentDto } from './environment.dto';
import { ServiceInstanceDto } from './service-instance.dto';
import { ServiceDto } from './service.dto';

export class GraphServerInstallInstanceDto extends ServiceInstanceDto {
  edgeProp!: EdgePropDto;
  environment!: EnvironmentDto;
  service!: ServiceDto;
}

export class GraphServerInstallsResponseDto extends ServiceInstanceDto {
  instances!: GraphServerInstallInstanceDto[];
}
