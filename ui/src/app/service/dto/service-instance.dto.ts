import {
  IsString,
  IsDefined,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EnvironmentDto } from './environment.dto';
import { IntentionActionPointerDto } from './intention-action-pointer.dto';
import { CollectionBaseDto, VertexPointerDto } from './vertex-pointer.dto';

// Shared DTO: Copy in back-end and front-end should be identical
export class ServiceInstanceBaseDto extends CollectionBaseDto {
  @IsString()
  @IsDefined()
  name!: string;

  @IsString()
  @IsOptional()
  url?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => IntentionActionPointerDto)
  action?: IntentionActionPointerDto;

  @IsArray()
  @IsOptional()
  @ValidateNested()
  @Type(() => IntentionActionPointerDto)
  actionHistory?: IntentionActionPointerDto[];
}

export class ServiceInstanceDto
  extends ServiceInstanceBaseDto
  implements VertexPointerDto
{
  @IsString()
  @IsDefined()
  id!: string;

  @IsString()
  @IsDefined()
  vertex!: string;
}

export class ServiceInstanceDetailsResponseDto extends ServiceInstanceDto {
  environment!: EnvironmentDto;
}
