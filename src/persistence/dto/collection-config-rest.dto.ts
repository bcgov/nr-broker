import { CollectionNames } from './collection-dto-union.type';
import { EdgeRestDto } from './edge-rest.dto';

// Shared DTO: Copy in back-end and front-end should be identical
export class CollectionEdgePermissions {
  request!: boolean;
}

export class CollectionEdgePrototype {
  description!: string;
  target!: string;
  targetName!: string;
  name!: string;
  permissions!: CollectionEdgePermissions;
  property!: CollectionFieldConfigMap;
  url!: string;
}

export class CollectionEdgeConfig {
  collection!: CollectionNames;
  name!: string;
  onDelete?: 'cascade';
  relation!: 'oneToMany' | 'oneToOne';
  show!: boolean;
  inboundName?: string;
  namePath?: string;
  prototypes?: CollectionEdgePrototype[];
}

export type CollectionEdgeInstanceConfig = Omit<
  CollectionEdgeConfig,
  'prototypes'
> & {
  prototype: CollectionEdgePrototype;
};

export class CollectionFieldConfig {
  hint?: string;
  init?: 'uuid';
  name!: string;
  placeholder?: string;
  required!: boolean;
  type!:
    | 'boolean'
    | 'email'
    | 'embeddedDoc'
    | 'embeddedDocArray'
    | 'json'
    | 'string'
    | 'stringArray'
    | 'url';
  unique?: boolean;
  uniqueParent?: boolean;
  value?: string;
}

export class CollectionFieldConfigMap {
  [key: string]: CollectionFieldConfig;
}

export class CollectionMap {
  getPath!: string;
  setPath!: string;
}

export class CollectionConfigParent {
  edgeName!: string;
}

export class CollectionConfigPermissions {
  create!: boolean;
  update!: boolean;
  delete!: boolean;
}

export class CollectionConfigRestDto {
  id!: string;
  collection!: CollectionNames;
  collectionMapper!: CollectionMap[];
  collectionVertexName!: string;
  edges!: CollectionEdgeConfig[];
  fields!: CollectionFieldConfigMap;
  index!: number;
  name!: string;
  parent!: CollectionConfigParent;
  permissions!: CollectionConfigPermissions;
  show!: boolean;
}

export type CollectionConfigInstanceRestDto = Omit<
  CollectionConfigRestDto,
  'edges'
> & {
  edge: CollectionEdgeInstanceConfig;
  instance?: EdgeRestDto;
};
