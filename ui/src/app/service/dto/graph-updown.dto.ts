import { VertexPointerDto } from '../dto/vertex-pointer.dto';
import { EdgeDto } from './edge.dto';
import { VertexDto } from './vertex.dto';

export class GraphUpDownDto<T extends VertexPointerDto> {
  collection!: T;
  edge!: EdgeDto;
  vertex!: VertexDto;
}
