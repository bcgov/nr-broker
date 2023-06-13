import { CollectionDtoUnion } from './collection-dto-union.type';
import { PointGeom } from './point.geom';

// Shared DTO: Copy in back-end and front-end should be identical

export interface VertexInsertDto {
  collection: keyof CollectionDtoUnion;
  data: any;
  geo?: PointGeom;
  prop?: any;
}
