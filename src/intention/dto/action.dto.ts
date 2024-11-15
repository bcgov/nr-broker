import { ApiHideProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Entity, Property } from '@mikro-orm/core';
import { UserDto } from './user.dto';
import { ServiceDto } from './service.dto';
import { TransactionDto } from './transaction.dto';
import { CloudDto } from './cloud.dto';
import { PackageDto } from './package.dto';
import { UrlDto } from './url.dto';
import { ArtifactDto } from './artifact.dto';
import { ActionSourceDto } from './action-source.dto';

export const ACTION_NAMES = [
  'backup',
  'database-access',
  'server-access',
  'package-build',
  'package-configure',
  'package-installation',
  'package-provision',
  'process-end',
  'process-start',
] as const;
type ActionName = (typeof ACTION_NAMES)[number];

export function isActionName(actionName: string): actionName is ActionName {
  return ACTION_NAMES.includes(actionName as ActionName);
}

@Entity()
export class ActionDto {
  @IsString()
  @IsIn(ACTION_NAMES)
  @Property()
  action: ActionName;

  @IsString()
  @Property()
  id: string;

  @ValidateNested()
  @IsOptional()
  @IsArray()
  @Property()
  @Type(() => ArtifactDto)
  artifacts?: ArtifactDto[];

  @IsArray()
  @Property()
  provision: string[];

  @ValidateNested()
  @IsOptional()
  @Property()
  @Type(() => CloudDto)
  cloud?: CloudDto;

  @ValidateNested()
  @IsDefined()
  @Property()
  @Type(() => ServiceDto)
  service: ServiceDto;

  @IsOptional()
  @IsString()
  @ApiHideProperty()
  @Property()
  lifecycle?: 'started' | 'ended';

  @ValidateNested()
  @IsOptional()
  @Property()
  @Type(() => PackageDto)
  package?: PackageDto;

  @ValidateNested()
  @IsOptional()
  @Property()
  @Type(() => ActionSourceDto)
  source?: ActionSourceDto;

  @ValidateNested()
  @IsOptional()
  @ApiHideProperty()
  @Property()
  @Type(() => TransactionDto)
  transaction?: TransactionDto;

  @ValidateNested()
  @IsOptional()
  @ApiHideProperty()
  @Property()
  @Type(() => TransactionDto)
  trace?: TransactionDto;

  @ValidateNested()
  @IsOptional()
  @Property()
  @Type(() => UrlDto)
  url?: UrlDto;

  @ValidateNested()
  @IsOptional()
  @ApiHideProperty()
  @Property()
  @Type(() => UserDto)
  user?: UserDto;

  @IsOptional()
  @IsBoolean()
  @ApiHideProperty()
  @Property()
  valid?: boolean;

  @IsOptional()
  @IsString()
  @Property()
  vaultEnvironment?: 'production' | 'test' | 'development' | 'tools';

  @IsOptional()
  @IsString()
  @Property()
  vaultInstance?: 'production' | 'test' | 'development';
}
