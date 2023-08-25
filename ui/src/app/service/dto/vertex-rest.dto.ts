import { CollectionNames } from './collection-names.type';
import { PointGeom } from './point.geom';

// Shared DTO: Copy in back-end and front-end should be identical

export class VertexPropDto {
  [key: string]: string;
}

export class VertexSearchDto {
  id!: string;
  collection!: CollectionNames;
  geo?: PointGeom;
  name!: string;
  prop?: VertexPropDto;
  edge!: {
    prop?: VertexPropDto;
  };
}

export class VertexInsertDto {
  collection!: CollectionNames;
  data: any;
  geo?: PointGeom;
  prop?: VertexPropDto;
}
