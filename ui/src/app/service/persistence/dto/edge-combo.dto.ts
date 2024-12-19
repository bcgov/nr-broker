// Shared DTO: Copy in back-end and front-end should be identical

import { EdgeDto } from './edge.dto';
import { VertexDto } from './vertex.dto';

export class EdgeComboDto {
  type!: 'edge';
  edge!: EdgeDto;
  source!: VertexDto;
  target!: VertexDto;
}
