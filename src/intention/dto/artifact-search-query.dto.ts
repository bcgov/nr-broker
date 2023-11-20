import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class ArtifactSearchQuery {
  @IsString()
  @IsOptional()
  buildGuid?: string;

  @IsString()
  @IsOptional()
  checksum?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  service: string;

  @IsInt()
  @Type(() => Number)
  offset: number;

  @IsString()
  @IsOptional()
  type?: string;

  @IsInt()
  @Type(() => Number)
  limit: number;
}
