import { CollectionDtoUnion } from './collection-dto-union.type';
import { EdgeEntity } from './edge.entity';
import { VertexEntity } from './vertex.entity';

export class GraphDirectedCombo {
  vertex: VertexEntity;
  edge: EdgeEntity;
}
export class GraphVertexConnections {
  upstream: GraphDirectedCombo[];
  downstream: GraphDirectedCombo[];
}

export class CollectionComboDto<
  T extends keyof CollectionDtoUnion,
> extends GraphVertexConnections {
  collection: CollectionDtoUnion[T];
  vertex: VertexEntity;
}
