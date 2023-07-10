import {
  CollectionConfigResponseDto,
  CollectionFieldConfig,
} from './dto/collection-config-rest.dto';
import {
  GraphDataResponseEdgeDto,
  GraphDataResponseDto,
  GraphDataResponseVertexDto,
} from './dto/graph-data.dto';

export type collectionNames =
  | 'environment'
  | 'project'
  | 'service'
  | 'serviceInstance'
  | 'user';

export interface CollectionFieldConfigNameMapped extends CollectionFieldConfig {
  key: string;
}

export type CollectionConfigMap = {
  [key: string]: CollectionConfigResponseDto;
};

export type ChartClickTarget = ChartClickTargetVertex | ChartClickTargetEdge;

export interface ChartClickTargetVertex {
  type: 'vertex';
  data: GraphDataVertex;
}

export interface ChartClickTargetEdge {
  type: 'edge';
  data: GraphDataResponseEdgeDto;
}

export interface GraphDataVertex extends GraphDataResponseVertexDto {
  parentName?: string;
  prop?: any;
}

export interface GraphDataConfig {
  data: GraphData;
  config: CollectionConfigMap;
}

export interface GraphData extends GraphDataResponseDto {
  idToEdge: {
    [key: string]: GraphDataResponseEdgeDto;
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
  edge: GraphDataResponseEdgeDto;
  vertex: GraphDataVertex;
}

export interface EdgeNavigation {
  edge: GraphDataResponseEdgeDto;
  sourceVertex: GraphDataVertex;
  targetVertex: GraphDataVertex;
}

export interface UserDto {
  id: string;
  email: string;
  guid: string;
  name: string;
  roles: string[];
  username: string;
}
