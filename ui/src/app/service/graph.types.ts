import {
  CollectionConfigRestDto,
  CollectionEdgeConfig,
  CollectionFieldConfig,
} from './dto/collection-config-rest.dto';
import { CollectionNames } from './dto/collection-dto-union.type';
import {
  GraphDataResponseEdgeDto,
  GraphDataResponseDto,
  GraphDataResponseVertexDto,
} from './dto/graph-data.dto';
import { UserPermissionRestDto } from './dto/user-permission-rest.dto';
import { VertexRestDto } from './dto/vertex-rest.dto';

export interface CollectionFieldConfigNameMapped extends CollectionFieldConfig {
  key: string;
}

export type CollectionConfigMap = {
  [key: string]: CollectionConfigRestDto;
};

export type CollectionEdgeConfigMap = {
  [key: string]: CollectionEdgeConfig;
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

export type InspectorTarget = InspectorTargetVertex | InspectorTargetEdge;

export interface InspectorTargetVertex {
  type: 'vertex';
  id: string;
  collection: CollectionNames;
  data?: VertexRestDto;
}

export interface InspectorTargetEdge {
  type: 'edge';
  id: string;
  source: string;
  target: string;
}

export interface GraphDataVertex extends GraphDataResponseVertexDto {
  parentName?: string;
  prop?: any;
}

export interface GraphDataConfig {
  data: GraphData;
  config: CollectionConfigMap;
  configSrcTarMap: CollectionEdgeConfigMap;
  permissions: UserPermissionRestDto;
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
  connections: ConnectionMap;
}

export interface ConnectionMap {
  [key: string]: Connection[];
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
  vertex: string;
}
