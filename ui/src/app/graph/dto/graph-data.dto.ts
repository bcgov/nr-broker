export interface GraphDataResponseEdgeDto {
  id: string;
  name: string;
  prop?: any;
  st: number[];
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
