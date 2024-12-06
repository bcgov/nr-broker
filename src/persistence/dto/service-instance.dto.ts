import { EnvironmentDto } from './environment.dto';
import { IntentionActionPointerDto } from './intention-action-pointer.dto';
import { VertexPointerDto } from './vertex-pointer.dto';

// Shared DTO: Copy in back-end and front-end should be identical
export class ServiceInstanceDto extends VertexPointerDto {
  id!: string;
  name!: string;
  url?: string;
  action?: IntentionActionPointerDto;
  actionHistory?: IntentionActionPointerDto[];
}

export class ServiceInstanceDetailsResponseDto extends ServiceInstanceDto {
  environment: EnvironmentDto;
}
