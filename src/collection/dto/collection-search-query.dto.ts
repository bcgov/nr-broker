import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CollectionSearchQuery {
  @IsOptional()
  @IsString()
  @Type(() => String)
  upstreamVertex: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  vertexId: string;

  @IsInt()
  @Type(() => Number)
  offset: number;

  @IsInt()
  @Type(() => Number)
  limit: number;
}
