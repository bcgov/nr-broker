import { IsString, IsDefined, IsOptional } from 'class-validator';
import { CollectionBaseDto, VertexPointerDto } from './vertex-pointer.dto';

// Shared DTO: Copy in back-end and front-end should be identical
export class TeamBaseDto extends CollectionBaseDto {
  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsDefined()
  name!: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class TeamDto extends TeamBaseDto implements VertexPointerDto {
  @IsString()
  @IsDefined()
  id!: string;

  @IsString()
  @IsDefined()
  vertex!: string;
}
