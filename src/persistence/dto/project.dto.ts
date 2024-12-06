import { VertexPointerDto } from './vertex-pointer.dto';

// Shared DTO: Copy in back-end and front-end should be identical
export class ProjectDto extends VertexPointerDto {
  id!: string;
  description?: string;
  email?: string;
  name!: string;
  title?: string;
  website?: string;
}
