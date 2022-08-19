import { IsDefined, IsString, ValidateNested } from 'class-validator';
import { ProvisionDto } from './provision.dto';

export class EventDto {
  @IsString()
  category: string;

  @IsString()
  type: string;
}

export class LabelsDto {
  @IsString()
  build: string;

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

export class DeployIntentionDto implements ProvisionDto {
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
