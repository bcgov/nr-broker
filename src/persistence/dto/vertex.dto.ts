import { IsObject, IsString, IsOptional } from 'class-validator';
import { CollectionNames } from './collection-dto-union.type';
import { PointGeomDto } from './point-geom.dto';
import { TimestampDto } from './timestamp.dto';

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
  geo?: PointGeomDto;
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

export class VertexDto {
  @IsString()
  id!: string;
  @IsString()
  collection!: CollectionNames;
  @IsString()
  name!: string;
  @IsOptional()
  @IsObject()
  geo?: PointGeomDto;
  @IsOptional()
  @IsObject()
  prop?: VertexPropDto;
  @IsOptional()
  @IsObject()
  timestamps?: TimestampDto;
}

export class VertexInsertDto {
  @IsString()
  collection!: CollectionNames;
  data: any;
  @IsOptional()
  @IsObject()
  geo?: PointGeomDto;
  @IsOptional()
  @IsObject()
  prop?: VertexPropDto;
}
