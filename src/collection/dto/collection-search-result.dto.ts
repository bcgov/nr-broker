// Shared DTO: Copy in back-end and front-end should be identical

import { VertexRestDto } from '../../persistence/dto/vertex-rest.dto';
import { CollectionDtoUnion } from '../../persistence/dto/collection-dto-union.type';
import { GraphDirectedRestCombo } from '../../persistence/dto/collection-combo-rest.dto';

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
  vertex!: VertexRestDto;
  upstream!: GraphDirectedRestCombo[];
  downstream!: GraphDirectedRestCombo[];
}
