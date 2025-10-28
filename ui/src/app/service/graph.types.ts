import {
  CollectionConfigDto,
  CollectionEdgeConfig,
  CollectionFieldConfig,
} from './persistence/dto/collection-config.dto';
import { CollectionNames } from './persistence/dto/collection-dto-union.type';
import {
  GraphDataResponseEdgeEntity,
  GraphDataResponseDto,
  GraphDataResponseVertexEntity,
} from './persistence/dto/graph-data.dto';
import { UserPermissionDto } from './persistence/dto/user-permission.dto';
import { VertexDto } from './persistence/dto/vertex.dto';

export interface CollectionFieldConfigNameMapped extends CollectionFieldConfig {
  key: string;
}

export type CollectionConfigNameRecord = Record<
  CollectionNames,
  CollectionConfigDto
>;

export type CollectionConfigStringRecord = Record<string, CollectionEdgeConfig>;

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
  config: CollectionConfigNameRecord;
  configSrcTarMap: CollectionConfigStringRecord;
  permissions: UserPermissionDto;
}

export interface GraphDataResponseEdgeEntityWithConfig
  extends GraphDataResponseEdgeEntity {
  lineStyle?: {
    type?: 'solid' | 'dotted' | 'dashed' | number | number[];
    color?: string;
  };
}

export interface GraphData extends GraphDataResponseDto {
  edges: GraphDataResponseEdgeEntityWithConfig[];
  idToEdge: Record<string, GraphDataResponseEdgeEntity>;
  idToVertex: Record<string, GraphDataVertex>;
}

// forward: inbound / reverse: outbound
export type ConnectionDirection = 'forward' | 'reverse';
export type GraphDataEdgeVertexKeys = 'target' | 'source';

export interface VertexNavigation {
  vertex: GraphDataVertex;
  direction: ConnectionDirection;
  connections: ConnectionMap;
}

export type ConnectionMap = Record<string, Connection[]>;

export interface Connection {
  edge: GraphDataResponseEdgeEntity;
  vertex: GraphDataVertex;
}

export interface EdgeNavigation {
  edge: GraphDataResponseEdgeEntity;
  sourceVertex: GraphDataVertex;
  targetVertex: GraphDataVertex;
}
