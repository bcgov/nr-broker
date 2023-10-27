import { IsObject, IsString, IsOptional } from 'class-validator';
import { CollectionNames } from './collection-dto-union.type';
import { PointGeom } from './point.geom';

// Shared DTO: Copy in back-end and front-end should be identical

export class VertexPropDto {
  [key: string]: string;
}

export class VertexSearchDto {
  @IsString()
  id!: string;
  @IsString()
  collection!: CollectionNames;
  @IsOptional()
  @IsObject()
  geo?: PointGeom;
  @IsString()
  name!: string;
  @IsOptional()
  @IsObject()
  prop?: VertexPropDto;
  @IsObject()
  edge!: {
    prop?: VertexPropDto;
  };
}

export class VertexInsertDto {
  @IsString()
  collection!: CollectionNames;
  data: any;
  @IsOptional()
  @IsObject()
  geo?: PointGeom;
  @IsOptional()
  @IsObject()
  prop?: VertexPropDto;
}
