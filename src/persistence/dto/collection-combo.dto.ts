import { CollectionDtoUnion } from './collection-dto-union.type';
import { EdgeDto } from './edge.dto';
import { VertexDto } from './vertex.dto';

export class GraphDirectedCombo {
  vertex: VertexDto;
  edge: EdgeDto;
}
export class GraphVertexConnections {
  upstream: GraphDirectedCombo[];
  downstream: GraphDirectedCombo[];
}

export class CollectionComboDto<
  T extends keyof CollectionDtoUnion,
> extends GraphVertexConnections {
  collection: CollectionDtoUnion[T];
  vertex: VertexDto;
}
