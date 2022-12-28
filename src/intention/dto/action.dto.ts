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

export class ActionDto {
  static plainToInstance(object: any): ActionDto {
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
    'database-access',
    'server-access',
    'package-configure',
    'package-installation',
    'package-provision',
  ])
  action:
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
}
