import {
  CollectionConfigDto,
  CollectionEdgeConfig,
  CollectionFieldConfig,
} from './dto/collection-config.dto';
import { CollectionNames } from './dto/collection-dto-union.type';
import {
  GraphDataResponseEdgeEntity,
  GraphDataResponseDto,
  GraphDataResponseVertexEntity,
} from './dto/graph-data.dto';
import { UserPermissionDto } from './dto/user-permission.dto';
import { VertexDto } from './dto/vertex.dto';

export interface CollectionFieldConfigNameMapped extends CollectionFieldConfig {
  key: string;
}

export type CollectionConfigMap = {
  [key: string]: CollectionConfigDto;
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
  data: GraphDataResponseEdgeEntity;
}

export type InspectorTarget = InspectorTargetVertex | InspectorTargetEdge;

export interface InspectorTargetVertex {
  type: 'vertex';
  id: string;
  collection: CollectionNames;
  data?: VertexDto;
}

export interface InspectorTargetEdge {
  type: 'edge';
  id: string;
  source: string;
  target: string;
}

export interface GraphDataVertex extends GraphDataResponseVertexEntity {
  parentName?: string;
  prop?: any;
}

export interface GraphDataConfig {
  data: GraphData;
  config: CollectionConfigMap;
  configSrcTarMap: CollectionEdgeConfigMap;
  permissions: UserPermissionDto;
}

export interface GraphData extends GraphDataResponseDto {
  idToEdge: {
    [key: string]: GraphDataResponseEdgeEntity;
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
  edge: GraphDataResponseEdgeEntity;
  vertex: GraphDataVertex;
}

export interface EdgeNavigation {
  edge: GraphDataResponseEdgeEntity;
  sourceVertex: GraphDataVertex;
  targetVertex: GraphDataVertex;
}
