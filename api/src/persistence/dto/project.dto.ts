import { IsString, IsOptional, IsDefined } from 'class-validator';
import { CollectionBaseDto, VertexPointerDto } from './vertex-pointer.dto';

// Shared DTO: Copy in back-end and front-end should be identical
export class ProjectBaseDto extends CollectionBaseDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsDefined()
  name!: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  website?: string;
}

export class ProjectDto extends ProjectBaseDto implements VertexPointerDto {
  @IsString()
  @IsDefined()
  id!: string;

  @IsString()
  @IsDefined()
  vertex!: string;
}
