import {
  IsString,
  IsDefined,
  IsOptional,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { CollectionBaseDto, VertexPointerDto } from './vertex-pointer.dto';
import { SyncStatusDto } from './sync-status.dto';
import { Type } from 'class-transformer';

// Shared DTO: Copy in back-end and front-end should be identical
export class RepositoryBaseDto extends CollectionBaseDto {
  @IsString()
  @IsDefined()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  scmUrl?: string;

  @IsBoolean()
  enableSyncSecrets!: boolean;

  @IsBoolean()
  enableSyncUsers!: boolean;

  @IsBoolean()
  enableSyncEnvironments!: boolean;

  @IsOptional()
  @IsObject()
  @Type(() => SyncStatusDto)
  syncSecretsStatus?: SyncStatusDto;

  @IsOptional()
  @IsObject()
  @Type(() => SyncStatusDto)
  syncUsersStatus?: SyncStatusDto;

  @IsOptional()
  @IsObject()
  @Type(() => SyncStatusDto)
  syncEnvironmentsStatus?: SyncStatusDto;
}

export class RepositoryDto
  extends RepositoryBaseDto
  implements VertexPointerDto
{
  @IsString()
  @IsDefined()
  id!: string;

  @IsString()
  @IsDefined()
  vertex!: string;
}
