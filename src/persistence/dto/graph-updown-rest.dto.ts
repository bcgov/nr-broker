import { EdgeRestDto } from './edge-rest.dto';
import { VertexPointerRestDto } from './vertex-pointer-rest.dto';
import { VertexRestDto } from './vertex-rest.dto';

export class GraphUpDownRestDto<T extends VertexPointerRestDto> {
  collection!: T;
  edge!: EdgeRestDto;
  vertex!: VertexRestDto;
}
