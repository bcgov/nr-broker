import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export enum PACKAGE_CATEGORY_NAMES {
  DATABASE = 'database',
  INFRASTRUCTURE = 'infrastructure',
  LIBRARY = 'library',
  SOFTWARE = 'software',
  UNKNOWN = 'unknown',
}

export class PackageDto {
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  architecture?: string;

  @IsString()
  @IsOptional()
  buildGuid?: string;

  @IsNumber()
  @IsOptional()
  buildNumber?: number;

  @IsString()
  @IsOptional()
  buildVersion?: string;

  @IsString()
  @IsOptional()
  @IsIn(Object.values(PACKAGE_CATEGORY_NAMES))
  category?: PACKAGE_CATEGORY_NAMES;

  @IsString()
  @IsOptional()
  checksum?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  installScope?: string;

  @IsString()
  @IsOptional()
  license?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  path?: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsNumber()
  @IsOptional()
  size?: number;

  @IsString()
  @IsOptional()
  source?: string;

  @IsString()
  @IsOptional()
  tag?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  version?: string;
}
