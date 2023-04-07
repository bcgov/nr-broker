export type collectionNames =
  | 'project'
  | 'service'
  | 'serviceInstance'
  | 'environment';

interface CollectionEdgeConfig {
  collection: collectionNames;
  name: string;
  relation: 'oneToMany' | 'oneToOne';
  inboundName?: string;
  namePath?: string;
}

interface CollectionFieldConfig {
  type: 'string' | 'json';
}

interface CollectionVertexConfig {
  property: {
    [key: string]: string;
  };
}

export type CollectionConfig = {
  [key in collectionNames]: {
    edges: Array<CollectionEdgeConfig>;
    fields: {
      [key: string]: CollectionFieldConfig;
    };
    vertex: CollectionVertexConfig;
  };
};

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

export interface GraphData {
  edges: Array<GraphDataEdge>;
  vertices: Array<GraphDataVertex>;
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
