// Shared DTO: Copy in back-end and front-end should be identical

import { PackageBuildDto } from 'src/persistence/dto/package-build.dto';
import { GraphDirectedRestCombo } from '../../persistence/dto/collection-combo-rest.dto';
import {
  CollectionDtoRestUnion,
  CollectionDtoUnion,
} from '../../persistence/dto/collection-dto-union.type';
import { VertexRestDto } from '../../persistence/dto/vertex-rest.dto';
import { GraphDirectedCombo } from 'src/persistence/dto/collection-combo.dto';
import { PackageBuildRestDto } from 'src/persistence/dto/package-build-rest.dto';
import { VertexDto } from 'src/persistence/dto/vertex.dto';

export class CollectionSearchResult<
  T extends CollectionDtoUnion[keyof CollectionDtoUnion] | PackageBuildDto,
> {
  data!: CollectionCombo<T>[];
  meta!: {
    total: number;
  };
}

export class CollectionCombo<
  T extends CollectionDtoUnion[keyof CollectionDtoUnion] | PackageBuildDto,
> {
  type!: 'vertex';
  collection!: T;
  vertex!: VertexDto;
  upstream!: GraphDirectedCombo[];
  downstream!: GraphDirectedCombo[];
}

export class CollectionSearchRestResult<
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
