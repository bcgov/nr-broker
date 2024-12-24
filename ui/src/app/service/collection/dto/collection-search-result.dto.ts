// Shared DTO: Copy in back-end and front-end should be identical

import { VertexDto } from '../../persistence/dto/vertex.dto';
import { CollectionDtoUnion } from '../../persistence/dto/collection-dto-union.type';
import { GraphDirectedCombo } from '../../persistence/dto/collection-combo.dto';

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
