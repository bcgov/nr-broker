import { IsString, IsDefined, IsOptional, IsBoolean } from 'class-validator';
import { CollectionBaseDto, VertexPointerDto } from './vertex-pointer.dto';

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
