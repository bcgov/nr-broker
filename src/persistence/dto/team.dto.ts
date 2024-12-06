import { VertexPointerDto } from './vertex-pointer.dto';

// Shared DTO: Copy in back-end and front-end should be identical
export class TeamDto extends VertexPointerDto {
  id!: string;
  email!: string;
  name!: string;
  website?: string;
}
