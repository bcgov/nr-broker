import { ApiHideProperty } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { UserDto } from './user.dto';
import { ServiceDto } from './service.dto';
import { TransactionDto } from './transaction.dto';
import { CloudDto } from './cloud.dto';

export class ActionDto {
  static plainToInstance(object: any): ActionDto {
    if (object.cloud) {
      object.cloud = CloudDto.plainToInstance(object.cloud);
    }
    if (object.service) {
      object.service = plainToInstance(ServiceDto, object.service);
    }
    if (object.transaction) {
      object.transaction = plainToInstance(TransactionDto, object.transaction);
    }
    if (object.trace) {
      object.trace = plainToInstance(TransactionDto, object.trace);
    }
    if (object.user) {
      object.user = plainToInstance(UserDto, object.user);
    }
    return object;
  }

  @IsString()
  @IsIn([
    'backup',
    'database-access',
    'server-access',
    'package-configure',
    'package-installation',
    'package-provision',
  ])
  action:
    | 'backup'
    | 'database-access'
    | 'server-access'
    | 'package-configure'
    | 'package-installation'
    | 'package-provision';

  @IsString()
  id: string;

  @IsArray()
  provision: string[];

  @ValidateNested()
  @IsOptional()
  cloud?: CloudDto;

  @ValidateNested()
  @IsDefined()
  service: ServiceDto;

  @ValidateNested()
  @IsOptional()
  @ApiHideProperty()
  transaction?: TransactionDto;

  @ValidateNested()
  @IsOptional()
  @ApiHideProperty()
  trace?: TransactionDto;

  @ValidateNested()
  @IsOptional()
  @ApiHideProperty()
  user?: UserDto;

  @IsOptional()
  @IsBoolean()
  @ApiHideProperty()
  valid?: boolean;

  @IsOptional()
  @IsString()
  vaultEnvironment?: 'production' | 'test' | 'development';

  @IsOptional()
  @IsString()
  vaultInstance?: 'production' | 'test' | 'development';
}
