import { VertexPointerDto } from './vertex-pointer.dto';

// Shared DTO: Copy in back-end and front-end should be identical
export interface GraphDataResponseEdgeDto {
  id: string;
  is: number;
  it: number;
  name: string;
  source: string;
  target: string;
}

export interface GraphDataResponseVertexDto {
  id: string;
  category: number;
  collection: string;
  index: number;
  name: string;
}

export interface GraphDataResponseCategoryDto {
  name: string;
}

export interface GraphDataResponseDto {
  edges: GraphDataResponseEdgeDto[];
  vertices: GraphDataResponseVertexDto[];
  categories: GraphDataResponseCategoryDto[];
}

export interface UpstreamResponseDto<T extends VertexPointerDto> {
  collection: T;
  path: GraphDataResponseEdgeDto;
}

export interface BrokerAccountProjectMapDto {
  [key: string]: BrokerAccountProjectDto;
}

export interface BrokerAccountProjectDto {
  name: string;
  services: string[];
}

export class GraphDeleteResponseDto {
  edge!: string[];
  vertex!: string[];
  adjacentVertex!: string[];
}
