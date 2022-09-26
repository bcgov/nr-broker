import { plainToInstance } from 'class-transformer';
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

export class MetaDto {
  @IsString()
  @IsOptional()
  fingerprint: string;

  @IsOptional()
  roles: string[];
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
  static plainToInstance(value: any): IntentionDto {
    const object = plainToInstance(IntentionDto, value);
    if (object.event) {
      object.event = plainToInstance(EventDto, object.event);
    }
    if (object.labels) {
      object.labels = plainToInstance(LabelsDto, object.labels);
    }
    if (object.meta) {
      object.meta = plainToInstance(MetaDto, object.meta);
    }
    if (object.service) {
      object.service = plainToInstance(ServiceDto, object.service);
    }
    if (object.user) {
      object.user = plainToInstance(UserDto, object.user);
    }
    return object;
  }

  @ValidateNested()
  @IsDefined()
  event: EventDto;

  @ValidateNested()
  @IsDefined()
  labels: LabelsDto;

  @IsOptional()
  meta: MetaDto | undefined;

  @ValidateNested()
  @IsDefined()
  service: ServiceDto;

  @ValidateNested()
  @IsDefined()
  user: UserDto;
}
