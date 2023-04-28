import { PointGeom } from './point.geom';

export interface VertexInsertDto {
  collection: string;
  data: any;
  geo?: PointGeom;
  prop?: any;
}
