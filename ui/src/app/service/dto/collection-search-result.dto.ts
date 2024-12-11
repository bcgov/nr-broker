// Shared DTO: Copy in back-end and front-end should be identical

import { GraphDirectedCombo } from './collection-combo.dto';
import { CollectionDtoUnion } from './collection-dto-union.type';
import { VertexDto } from './vertex.dto';

export class CollectionSearchResult<
  T extends CollectionDtoUnion[keyof CollectionDtoUnion],
> {
  data!: CollectionCombo<T>[];
  meta!: {
    total: number;
  };
}

export class CollectionCombo<
  T extends CollectionDtoUnion[keyof CollectionDtoUnion],
> {
  type!: 'vertex';
  collection!: T;
  vertex!: VertexDto;
  upstream!: GraphDirectedCombo[];
  downstream!: GraphDirectedCombo[];
}
