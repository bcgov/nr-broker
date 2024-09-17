import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class PackageBuildSearchQuery {
  @IsOptional()
  @IsString()
  @Type(() => String)
  serviceId?: string;

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
