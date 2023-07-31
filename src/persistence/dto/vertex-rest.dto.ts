import { PointGeom } from './point.geom';

// Shared DTO: Copy in back-end and front-end should be identical

export class VertexPropDto {
  [key: string]: string;
}

type CollectionNames =
  | 'brokerAccount'
  | 'environment'
  | 'project'
  | 'serviceInstance'
  | 'service'
  | 'team'
  | 'user';

export class VertexSearchDto {
  id!: string;
  collection!: CollectionNames;
  geo?: PointGeom;
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
