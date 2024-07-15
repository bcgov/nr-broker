import { IsObject, IsOptional, IsString } from 'class-validator';
import { EdgePropDto } from './edge-prop.dto';
import { TimestampRestDto } from './timestamp-rest.dto';
// Shared DTO: Copy in back-end and front-end should be identical

export class EdgeInsertDto {
  @IsString()
  name!: string;
  @IsOptional()
  @IsObject()
  prop?: EdgePropDto;
  @IsString()
  source!: string;
  @IsString()
  target!: string;
}

export class EdgeRestDto extends EdgeInsertDto {
  id!: string;
  is!: number;
  it!: number;
  timestamps?: TimestampRestDto;
}
