import {
  IsDefined,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PackageBuildSearchResult } from './package-build.dto';
import { ServiceInstanceDetailsResponseDto } from './service-instance.dto';
import { VaultConfigDto } from './vault-config.dto';
import { CollectionBaseDto, VertexPointerDto } from './vertex-pointer.dto';
import { CollectionWatchDto } from './collection-watch.dto';

// Shared DTO: Copy in back-end and front-end should be identical
export class ServiceBaseDto extends CollectionBaseDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsDefined()
  name!: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  lifecycle?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @ValidateNested()
  @IsOptional()
  @Type(() => VaultConfigDto)
  vaultConfig?: VaultConfigDto;

  @ValidateNested()
  @IsOptional()
  @Type(() => CollectionWatchDto)
  watchers?: CollectionWatchDto[];
}

export class ServiceDto extends ServiceBaseDto implements VertexPointerDto {
  @IsString()
  @IsDefined()
  id!: string;

  @IsString()
  @IsDefined()
  vertex!: string;
}

export class ServiceDetailsResponseDto extends ServiceDto {
  serviceInstance!: ServiceInstanceDetailsResponseDto[];
  builds!: PackageBuildSearchResult;
}
