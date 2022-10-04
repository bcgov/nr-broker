import { plainToInstance } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { TransactionDto } from './transaction.dto';

export class ServiceDto {
  @IsString()
  environment: string;

  @IsString()
  name: string;

  @IsString()
  project: string;

  @IsString()
  @IsOptional()
  version?: string;
}

export class ActionDto {
  static plainToInstance(object: any): ActionDto {
    if (object.service) {
      object.service = plainToInstance(ServiceDto, object.service);
    }
    if (object.transaction) {
      object.transaction = plainToInstance(TransactionDto, object.transaction);
    }
    return object;
  }

  @IsString()
  @IsIn([
    'database-access',
    'server-access',
    'package-installation',
    'package-provision',
  ])
  action:
    | 'database-access'
    | 'server-access'
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
  transaction?: TransactionDto;
}
