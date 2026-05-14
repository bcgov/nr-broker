import { Type } from 'class-transformer';
import { IsDefined, IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { PACKAGE_CATEGORY_NAMES } from './package.dto';

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
  offset!: number;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsString()
  @IsOptional()
  outcome?: string;

  @IsString()
  @IsOptional()
  @IsIn(Object.values(PACKAGE_CATEGORY_NAMES))
  category?: PACKAGE_CATEGORY_NAMES;

  @IsInt()
  @IsDefined()
  @Type(() => Number)
  limit!: number;
}
