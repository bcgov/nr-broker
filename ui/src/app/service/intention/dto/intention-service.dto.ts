import { Type } from 'class-transformer';
import {
  IsDefined,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { ServiceTargetDto } from './service-target.dto';
import { ENVIRONMENT_NAMES } from './constants.dto';

export class IntentionServiceDto {
  @IsString()
  @IsDefined()
  environment!: ENVIRONMENT_NAMES;

  @IsOptional()
  id?: string;

  // Defaults to environment
  @IsString()
  @IsOptional()
  instanceName?: string;

  @IsString()
  @IsDefined()
  @Length(1)
  name!: string;

  @IsString()
  @IsDefined()
  @Length(1)
  project!: string;

  @ValidateNested()
  @IsOptional()
  @Type(() => ServiceTargetDto)
  target?: ServiceTargetDto;
}
