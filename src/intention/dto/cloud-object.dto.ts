import { plainToInstance } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';

class CloudObjectAccountDto {
  @IsString()
  id: string;

  @IsString()
  name: string;
}

class CloudObjectInstanceDto {
  @IsString()
  id: string;

  @IsString()
  name: string;
}

class CloudObjectMachineDto {
  @IsString()
  type: string;
}

class CloudObjectProjectDto {
  @IsString()
  id: string;

  @IsString()
  name: string;
}

class CloudObjectServiceDto {
  @IsString()
  name: string;
}

export class CloudObjectDto {
  static plainToInstance(object: any): CloudObjectDto {
    if (object.account) {
      object.account = plainToInstance(CloudObjectAccountDto, object.account);
    }
    if (object.instance) {
      object.instance = plainToInstance(
        CloudObjectInstanceDto,
        object.instance,
      );
    }
    if (object.machine) {
      object.machine = plainToInstance(CloudObjectMachineDto, object.machine);
    }
    if (object.project) {
      object.project = plainToInstance(CloudObjectProjectDto, object.project);
    }
    if (object.service) {
      object.service = plainToInstance(CloudObjectServiceDto, object.service);
    }
    return plainToInstance(CloudObjectDto, object);
  }
  @ValidateNested()
  @IsOptional()
  account?: CloudObjectAccountDto;

  @IsString()
  @IsOptional()
  availability_zone?: string;

  @ValidateNested()
  @IsOptional()
  instance?: CloudObjectInstanceDto;

  @ValidateNested()
  @IsOptional()
  machine?: CloudObjectMachineDto;

  @ValidateNested()
  @IsOptional()
  project?: CloudObjectProjectDto;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @ValidateNested()
  @IsOptional()
  service?: CloudObjectServiceDto;
}
