import {
  IsArray,
  IsDefined,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EdgePropDto } from './edge-prop.dto';
import { TimestampDto } from './timestamp.dto';
import { ProvenanceDto } from './provenance.dto';
// Shared DTO: Copy in back-end and front-end should be identical

export class EdgeInsertDto {
  @IsString()
  @IsDefined()
  name!: string;

  @ValidateNested()
  @IsOptional()
  @IsObject()
  @Type(() => EdgePropDto)
  prop?: EdgePropDto;

  @IsString()
  @IsDefined()
  source!: string;

  @IsString()
  @IsDefined()
  target!: string;
}

export class EdgeDto extends EdgeInsertDto {
  id!: string;
  is!: number;
  it!: number;
  restrict?: boolean;
  timestamps?: TimestampDto;

  @IsOptional()
  @IsArray()
  @Type(() => ProvenanceDto)
  provenance?: ProvenanceDto[];
}
