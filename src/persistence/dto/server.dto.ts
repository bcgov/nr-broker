import { IsDate, IsDefined, IsOptional, IsString } from 'class-validator';
import { CollectionBaseDto, VertexPointerDto } from './vertex-pointer.dto';
import { Type } from 'class-transformer';

// Shared DTO: Copy in back-end and front-end should be identical
export class ServerBaseDto extends CollectionBaseDto {
  @IsDate()
  @IsDefined()
  @Type(() => Date)
  acquired!: Date;

  @IsString()
  @IsOptional()
  architecture?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsDefined()
  hostName!: string;

  @IsString()
  @IsDefined()
  name!: string;

  @IsString()
  @IsOptional()
  osFamily?: string;

  @IsString()
  @IsOptional()
  osFull?: string;

  @IsString()
  @IsOptional()
  osKernel?: string;

  @IsString()
  @IsOptional()
  osName?: string;

  @IsString()
  @IsOptional()
  osType?: string;

  @IsString()
  @IsOptional()
  osPlatform?: string;

  @IsString()
  @IsOptional()
  osVersion?: string;
}

export class ServerDto extends ServerBaseDto implements VertexPointerDto {
  @IsString()
  @IsDefined()
  id!: string;

  @IsString()
  @IsDefined()
  vertex!: string;
}
