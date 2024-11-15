import { EdgeEntity } from './edge.entity';
import { VertexPointerDto } from './vertex-pointer.dto';
import { VertexEntity } from './vertex.entity';

export class GraphUpDownDto<T extends VertexPointerDto> {
  collection: T;
  edge: EdgeEntity;
  vertex: VertexEntity;
}
