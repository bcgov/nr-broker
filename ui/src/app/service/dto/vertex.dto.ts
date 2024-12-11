import {
  IsObject,
  IsString,
  IsOptional,
  ValidateNested,
  IsDefined,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CollectionBaseDtoUnionObject,
  CollectionNames,
} from './collection-dto-union.type';
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
  @Type(() => PointGeomDto)
  geo?: PointGeomDto;

  @IsOptional()
  @IsObject()
  prop?: VertexPropDto;

  @IsOptional()
  @IsObject()
  @Type(() => TimestampDto)
  timestamps?: TimestampDto;
}

export class VertexInsertDto {
  @IsString()
  @IsDefined()
  collection!: CollectionNames;

  @ValidateNested()
  @IsDefined()
  @Type((opts) => {
    return CollectionBaseDtoUnionObject[
      opts?.object['collection'] as CollectionNames
    ];
  })
  data: any;

  @ValidateNested()
  @IsOptional()
  @IsObject()
  @Type(() => PointGeomDto)
  geo?: PointGeomDto;

  @IsOptional()
  @IsObject()
  @Type(() => VertexPropDto)
  prop?: VertexPropDto;
}
