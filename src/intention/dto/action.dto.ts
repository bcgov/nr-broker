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
import { Entity, Column } from 'typeorm';
import { UserDto } from './user.dto';
import { ServiceDto } from './service.dto';
import { TransactionDto } from './transaction.dto';
import { CloudDto } from './cloud.dto';

@Entity()
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
  @Column()
  action:
    | 'backup'
    | 'database-access'
    | 'server-access'
    | 'package-configure'
    | 'package-installation'
    | 'package-provision';

  @IsString()
  @Column()
  id: string;

  @IsArray()
  @Column()
  provision: string[];

  @ValidateNested()
  @IsOptional()
  @Column(() => CloudDto)
  cloud?: CloudDto;

  @ValidateNested()
  @IsDefined()
  @Column(() => ServiceDto)
  service: ServiceDto;

  @ValidateNested()
  @IsOptional()
  @ApiHideProperty()
  @Column(() => TransactionDto)
  transaction?: TransactionDto;

  @ValidateNested()
  @IsOptional()
  @ApiHideProperty()
  @Column(() => TransactionDto)
  trace?: TransactionDto;

  @ValidateNested()
  @IsOptional()
  @ApiHideProperty()
  @Column(() => UserDto)
  user?: UserDto;

  @IsOptional()
  @IsBoolean()
  @ApiHideProperty()
  @Column()
  valid?: boolean;

  @IsOptional()
  @IsString()
  @Column()
  vaultEnvironment?: 'production' | 'test' | 'development';

  @IsOptional()
  @IsString()
  @Column()
  vaultInstance?: 'production' | 'test' | 'development';
}
