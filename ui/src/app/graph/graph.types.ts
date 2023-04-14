export type collectionNames =
  | 'environment'
  | 'project'
  | 'service'
  | 'serviceInstance';

export interface CollectionEdgeConfig {
  collection: collectionNames;
  name: string;
  onDelete?: 'cascade';
  relation: 'oneToMany' | 'oneToOne';
  inboundName?: string;
  namePath?: string;
}

interface CollectionFieldConfig {
  type: 'string' | 'json';
}

export interface CollectionFieldConfigMap {
  [key: string]: CollectionFieldConfig;
}

interface CollectionVertexConfig {
  property: {
    [key: string]: string;
  };
}

export type CollectionConfigMap = {
  [key in collectionNames]: CollectionConfig;
};

export interface CollectionConfig {
  collection: collectionNames;
  index: number;
  edges: CollectionEdgeConfig[];
  fields: CollectionFieldConfigMap;
  vertex: CollectionVertexConfig;
}

export type ChartClickTarget = ChartClickTargetVertex | ChartClickTargetEdge;

export interface ChartClickTargetVertex {
  type: 'vertex';
  data: GraphDataVertex;
}

export interface ChartClickTargetEdge {
  type: 'edge';
  data: GraphDataEdge;
}

export interface GraphDataEdge {
  id: string;
  name: string;
  st: number[];
  source: string;
  target: string;
  prop?: any;
}

export interface GraphDataVertex {
  id: string;
  category: number;
  collection: collectionNames;
  name: string;
  parentName?: string;
  prop?: any;
}

export interface GraphDataConfig {
  data: GraphData;
  config: CollectionConfigMap;
}

export interface GraphData {
  categories: any[];
  edges: Array<GraphDataEdge>;
  vertices: Array<GraphDataVertex>;
  idToEdge: {
    [key: string]: GraphDataEdge;
  };
  idToVertex: {
    [key: string]: GraphDataVertex;
  };
}

// forward: inbound / reverse: outbound
export type ConnectionDirection = 'forward' | 'reverse';
export type GraphDataEdgeVertexKeys = 'target' | 'source';

export interface VertexNavigation {
  vertex: GraphDataVertex;
  direction: ConnectionDirection;
  connections: {
    [key: string]: Connection[];
  };
}

export interface Connection {
  edge: GraphDataEdge;
  vertex: GraphDataVertex;
}

export interface EdgeNavigation {
  edge: GraphDataEdge;
  sourceVertex: GraphDataVertex;
  targetVertex: GraphDataVertex;
}
