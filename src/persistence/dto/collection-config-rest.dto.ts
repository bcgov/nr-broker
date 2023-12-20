import { ApiProperty } from '@nestjs/swagger';
import {
  CollectionNameEnum,
  CollectionNames,
} from './collection-dto-union.type';

// Shared DTO: Copy in back-end and front-end should be identical
export class CollectionEdgeConfig {
  @ApiProperty({
    enum: Object.keys(CollectionNameEnum),
  })
  collection: CollectionNames;
  name: string;
  onDelete?: 'cascade';
  relation: 'oneToMany' | 'oneToOne';
  show: boolean;
  inboundName?: string;
  namePath?: string;
}

export class CollectionFieldConfig {
  hint?: string;
  init?: 'uuid';
  name: string;
  placeholder?: string;
  required: boolean;
  type:
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
  getPath: string;
  setPath: string;
}

export class CollectionConfigParent {
  edgeName: string;
}

export class CollectionConfigPermissions {
  create: boolean;
  update: boolean;
  delete: boolean;
}

export class CollectionConfigResponseDto {
  id: string;
  @ApiProperty({
    enum: Object.keys(CollectionNameEnum),
  })
  collection: CollectionNames;
  collectionMapper: CollectionMap[];
  collectionVertexName: string;
  edges: CollectionEdgeConfig[];
  fields: CollectionFieldConfigMap;
  index: number;
  name: string;
  parent?: CollectionConfigParent;
  permissions: CollectionConfigPermissions;
  show: boolean;
}
