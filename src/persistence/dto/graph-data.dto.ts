// Shared DTO: Copy in backend and frontend should be identical
export interface GraphDataResponseEdgeDto {
  id: string;
  is: number;
  it: number;
  name: string;
  prop?: any;
  source: string;
  target: string;
}

export interface GraphDataResponseVertexDto {
  id: string;
  category: number;
  collection: string;
  index: number;
  name: string;
  prop?: any;
}

export interface GraphDataResponseCategoryDto {
  name: string;
}

export interface GraphDataResponseDto {
  edges: GraphDataResponseEdgeDto[];
  vertices: GraphDataResponseVertexDto[];
  categories: GraphDataResponseCategoryDto[];
}
