// Shared DTO: Copy in back-end and front-end should be identical

import { GraphDirectedRestCombo } from './collection-combo-rest.dto';
import { CollectionDtoRestUnion } from './collection-dto-union.type';
import { PackageBuildRestDto } from './package-build-rest.dto';
import { VertexRestDto } from './vertex-rest.dto';

export class CollectionSearchResult<
  T extends
    | CollectionDtoRestUnion[keyof CollectionDtoRestUnion]
    | PackageBuildRestDto,
> {
  data!: CollectionCombo<T>[];
  meta!: {
    total: number;
  };
}

export class CollectionCombo<
  T extends
    | CollectionDtoRestUnion[keyof CollectionDtoRestUnion]
    | PackageBuildRestDto,
> {
  type!: 'vertex';
  collection!: T;
  vertex!: VertexRestDto;
  upstream!: GraphDirectedRestCombo[];
  downstream!: GraphDirectedRestCombo[];
}
