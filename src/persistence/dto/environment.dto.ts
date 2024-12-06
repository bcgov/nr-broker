import { VertexPointerDto } from './vertex-pointer.dto';

// Shared DTO: Copy in back-end and front-end should be identical

export class EnvironmentDto extends VertexPointerDto {
  id!: string;
  name!: string;
  short!: string;
  aliases!: string[];
  title!: string;
  position!: number;
}
