// Shared DTO: Copy in back-end and front-end should be identical

import { VertexDto } from './vertex.dto';
import { CollectionDtoUnion } from './collection-dto-union.type';
import { EdgeDto } from './edge.dto';

export class GraphDirectedCombo {
  vertex!: VertexDto;
  edge!: EdgeDto;
}

export class GraphVertexConnections {
  upstream: GraphDirectedCombo[];
  downstream: GraphDirectedCombo[];
}

export class CollectionComboDto<T extends keyof CollectionDtoUnion> {
  type!: 'vertex';
  collection!: CollectionDtoUnion[T];
  vertex!: VertexDto;
  upstream!: GraphDirectedCombo[];
  downstream!: GraphDirectedCombo[];
}
