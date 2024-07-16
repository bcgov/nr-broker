import { EdgeDto } from './edge.dto';
import { VertexPointerDto } from './vertex-pointer.dto';
import { VertexDto } from './vertex.dto';

export class GraphUpDownDto<T extends VertexPointerDto> {
  collection: T;
  edge: EdgeDto;
  vertex: VertexDto;
}
