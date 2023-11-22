import { VertexPointerRestDto } from './vertex-pointer-rest.dto';

// Shared DTO: Copy in back-end and front-end should be identical
export class TeamRestDto extends VertexPointerRestDto {
  id!: string;
  email!: string;
  name!: string;
  website?: string;
}
