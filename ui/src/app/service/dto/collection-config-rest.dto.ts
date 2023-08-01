import { CollectionNames } from './collection-names.type';

// Shared DTO: Copy in back-end and front-end should be identical
export interface CollectionEdgeConfig {
  collection: CollectionNames;
  name: string;
  onDelete?: 'cascade';
  relation: 'oneToMany' | 'oneToOne';
  show: true;
  inboundName?: string;
  namePath?: string;
}

export interface CollectionFieldConfigMap {
  [key: string]: CollectionFieldConfig;
}

export interface CollectionFieldConfig {
  hint?: string;
  init?: 'uuid';
  name: string;
  placeholder?: string;
  required: boolean;
  type:
    | 'boolean'
    | 'email'
    | 'embeddedDocArray'
    | 'json'
    | 'string'
    | 'stringArray'
    | 'url';
  unique?: boolean;
  value?: string;
}

export interface CollectionMap {
  getPath: string;
  setPath: string;
}

export interface CollectionConfigResponseDto {
  id: string;
  collection: CollectionNames;
  collectionMapper: CollectionMap[];
  collectionVertexName: string;
  edges: CollectionEdgeConfig[];
  fields: CollectionFieldConfigMap;
  index: number;
  name: string;
  parent?: {
    edgeName: string;
  };
  permissions: {
    create: boolean;
    update: boolean;
    delete: boolean;
  };
  show: true;
}
