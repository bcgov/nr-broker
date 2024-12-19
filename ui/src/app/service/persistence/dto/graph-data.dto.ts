// Shared DTO: Copy in back-end and front-end should be identical
export interface GraphDataResponseEdgeEntity {
  id: string;
  is: number;
  it: number;
  name: string;
  source: string;
  target: string;
}

export interface GraphDataResponseVertexEntity {
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
  edges: GraphDataResponseEdgeEntity[];
  vertices: GraphDataResponseVertexEntity[];
  categories: GraphDataResponseCategoryDto[];
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
