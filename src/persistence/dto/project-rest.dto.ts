import { VertexPointerRestDto } from './vertex-pointer-rest.dto';

// Shared DTO: Copy in back-end and front-end should be identical
export class ProjectRestDto extends VertexPointerRestDto {
  id!: string;
  description?: string;
  email?: string;
  name!: string;
  title?: string;
  website?: string;
}
