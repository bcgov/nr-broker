import { CollectionDtoUnion } from './collection-dto-union.type';
import { PointGeom } from './point.geom';

// Shared DTO: Copy in back-end and front-end should be identical

export interface VertexSearchDto {
  id: string;
  collection: string;
  data: any;
  geo?: PointGeom;
  prop?: { [key: string]: string };
  edge: {
    prop?: { [key: string]: string };
  };
}

export interface VertexInsertDto {
  collection: keyof CollectionDtoUnion;
  data: any;
  geo?: PointGeom;
  prop?: any;
}
