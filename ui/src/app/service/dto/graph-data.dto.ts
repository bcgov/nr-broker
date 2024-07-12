import { CollectionNames } from './collection-dto-union.type';

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
  collection: CollectionNames;
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

export interface UpstreamResponseDto<T = any> {
  collection: T;
  path: GraphDataResponseEdgeDto;
}

export class GraphDeleteResponseDto {
  edge!: string[];
  vertex!: string[];
  adjacentVertex!: string[];
}
