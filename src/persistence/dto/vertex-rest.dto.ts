import { PointGeom } from './point.geom';

// Shared DTO: Copy in backend and frontend should be identical

export interface VertexInsertDto {
  collection: string;
  data: any;
  geo?: PointGeom;
  prop?: any;
}
