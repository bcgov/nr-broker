import { Transform, Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class CollectionSearchQuery {
  @IsOptional()
  @IsString()
  @Type(() => String)
  q?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  @Transform(({ value }) => (value && !Array.isArray(value) ? [value] : value))
  tags?: string[];

  @IsOptional()
  @IsString()
  @Type(() => String)
  upstreamVertex?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  downstreamVertex?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  id?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  vertexId?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  sort?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  dir?: string;

  @IsInt()
  @Type(() => Number)
  offset: number;

  @IsInt()
  @Type(() => Number)
  limit: number;
}
