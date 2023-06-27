// Shared DTO: Copy in back-end and front-end should be identical
export interface CollectionEdgeConfig {
  collection: string;
  name: string;
  onDelete?: 'cascade';
  relation: 'oneToMany' | 'oneToOne';
  inboundName?: string;
  namePath?: string;
}

export interface CollectionFieldConfigMap {
  [key: string]: CollectionFieldConfig;
}

export interface CollectionFieldConfig {
  hint?: string;
  init?: 'uuid';
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
  collection: string;
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
}
