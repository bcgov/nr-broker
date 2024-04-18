import { Type } from 'class-transformer';
import { IsDefined, IsInt, IsOptional, IsString } from 'class-validator';

export class ArtifactSearchQuery {
  @IsString()
  @IsOptional()
  intention?: string;

  @IsString()
  @IsOptional()
  action?: string;

  @IsString()
  @IsOptional()
  checksum?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  service?: string;

  @IsString()
  @IsOptional()
  serviceId?: string;

  @IsString()
  @IsOptional()
  traceHash?: string;

  @IsInt()
  @IsDefined()
  @Type(() => Number)
  offset: number;

  @IsString()
  @IsOptional()
  type?: string;

  @IsInt()
  @IsDefined()
  @Type(() => Number)
  limit: number;
}
