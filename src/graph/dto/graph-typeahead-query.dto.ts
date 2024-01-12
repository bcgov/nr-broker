import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class GraphTypeaheadQuery {
  @IsOptional()
  @IsString()
  @Type(() => String)
  q: string;

  @IsOptional()
  @IsArray()
  @Type(() => String)
  collections?: string[];

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  offset?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number;
}
