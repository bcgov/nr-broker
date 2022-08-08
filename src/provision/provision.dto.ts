import { IsString, ValidateNested } from 'class-validator';
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

export class ProvisionDto {
  @ValidateNested()
  event: EventDto;
  @ValidateNested()
  labels: LabelsDto;
  @ValidateNested()
  service: ServiceDto;
  @ValidateNested()
  user: UserDto;
}
