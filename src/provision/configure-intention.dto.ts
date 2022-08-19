import {
  IsDefined,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ProvisionDto } from './provision.dto';

export class EventDto {
  @IsString()
  action: string;

  @IsString()
  category: string;

  @IsString()
  reason: string;

  @IsString()
  type: string;

  @IsString()
  @IsOptional()
  url: string;
}

export class LabelsDto {
  @IsString()
  project: string;
}

export class ServiceDto {
  @IsString()
  name: string;

  @IsString()
  environment: string;

  @IsString()
  version: string;
}

export class UserDto {
  @IsString()
  id: string;
}

export class ConfigureIntentionDto implements ProvisionDto {
  @ValidateNested()
  @IsDefined()
  event: EventDto;

  @ValidateNested()
  @IsDefined()
  labels: LabelsDto;

  @ValidateNested()
  @IsDefined()
  service: ServiceDto;

  @ValidateNested()
  @IsDefined()
  user: UserDto;
}
