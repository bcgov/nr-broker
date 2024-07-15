// Shared DTO: Copy in back-end and front-end should be identical

import { EdgeRestDto } from './edge-rest.dto';
import { VertexRestDto } from './vertex-rest.dto';

export class EdgeComboRestDto {
  type!: 'edge';
  edge!: EdgeRestDto;
  source!: VertexRestDto;
  target!: VertexRestDto;
}
