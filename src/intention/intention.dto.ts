import {
  IsDefined,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class EventDto {
  @IsString()
  @IsOptional()
  action: string;

  @IsString()
  category: string;

  @IsString()
  @IsOptional()
  reason: string;

  @IsString()
  type: string;

  @IsString()
  @IsOptional()
  url: string;
}

export class LabelsDto {
  @IsString()
  @IsOptional()
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

export class IntentionDto {
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
