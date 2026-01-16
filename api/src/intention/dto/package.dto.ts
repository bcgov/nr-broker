import { IsNumber, IsOptional, IsString } from 'class-validator';

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
  type?: string;

  @IsString()
  @IsOptional()
  version?: string;
}
