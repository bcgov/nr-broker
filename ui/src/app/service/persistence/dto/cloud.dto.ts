import { IsString, IsDefined, IsOptional, ValidateIf } from 'class-validator';
import { CollectionBaseDto, VertexPointerDto } from './vertex-pointer.dto';

// Shared DTO: Copy in back-end and front-end should be identical
export class CloudBaseDto extends CollectionBaseDto {
  @IsString()
  @IsDefined()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsDefined()
  type!: string;

  // subclass: openshift
  @ValidateIf((o) => o.type === 'openshift')
  @IsString()
  @IsOptional()
  consoleUrl?: string;

  // subclass: openshift
  @ValidateIf((o) => o.type === 'openshift')
  @IsString()
  @IsOptional()
  clusterName?: string;

  // subclass: openshift
  @ValidateIf((o) => o.type === 'openshift')
  @IsString()
  @IsOptional()
  apiUrl?: string;
}

export class CloudDto extends CloudBaseDto implements VertexPointerDto {
  @IsString()
  @IsDefined()
  id!: string;

  @IsString()
  @IsDefined()
  vertex!: string;
}
