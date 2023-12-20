import { IntentionActionPointerRestDto } from './intention-action-pointer-rest.dto';
import { VertexPointerRestDto } from './vertex-pointer-rest.dto';

// Shared DTO: Copy in back-end and front-end should be identical
export interface ServiceInstanceRestDto extends VertexPointerRestDto {
  id: string;
  name: string;
  action?: IntentionActionPointerRestDto;
  actionHistory?: IntentionActionPointerRestDto[];
}
