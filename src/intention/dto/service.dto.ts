import { IsOptional, IsString } from 'class-validator';

export class ServiceDto {
  @IsString()
  environment: string;

  @IsString()
  name: string;

  @IsString()
  project: string;

  @IsString()
  @IsOptional()
  version?: string;
}
