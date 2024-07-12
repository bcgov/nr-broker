// Shared DTO: Copy in back-end and front-end should be identical

import { VertexRestDto } from './vertex-rest.dto';
import { CollectionDtoRestUnion } from './collection-dto-union.type';
import { EdgeRestDto } from './edge-rest.dto';

export class GraphDirectedRestCombo {
  vertex!: VertexRestDto;
  edge!: EdgeRestDto;
}

export class CollectionComboRestDto<T extends keyof CollectionDtoRestUnion> {
  type!: 'vertex';
  collection!: CollectionDtoRestUnion[T];
  vertex!: VertexRestDto;
  upstream!: GraphDirectedRestCombo[];
  downstream!: GraphDirectedRestCombo[];
}
