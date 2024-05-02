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
import { Entity, Column } from 'typeorm';
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
  @Column()
  action: ActionName;

  @IsString()
  @Column()
  id: string;

  @ValidateNested()
  @IsOptional()
  @IsArray()
  @Column(() => ArtifactDto)
  @Type(() => ArtifactDto)
  artifacts?: ArtifactDto[];

  @IsArray()
  @Column()
  provision: string[];

  @ValidateNested()
  @IsOptional()
  @Column(() => CloudDto)
  @Type(() => CloudDto)
  cloud?: CloudDto;

  @ValidateNested()
  @IsDefined()
  @Column(() => ServiceDto)
  @Type(() => ServiceDto)
  service: ServiceDto;

  @IsOptional()
  @IsString()
  @ApiHideProperty()
  @Column()
  lifecycle?: 'started' | 'ended';

  @ValidateNested()
  @IsOptional()
  @Column(() => PackageDto)
  @Type(() => PackageDto)
  package?: PackageDto;

  @ValidateNested()
  @IsOptional()
  @Column(() => ActionSourceDto)
  @Type(() => ActionSourceDto)
  source?: ActionSourceDto;

  @ValidateNested()
  @IsOptional()
  @ApiHideProperty()
  @Column(() => TransactionDto)
  @Type(() => TransactionDto)
  transaction?: TransactionDto;

  @ValidateNested()
  @IsOptional()
  @ApiHideProperty()
  @Column(() => TransactionDto)
  @Type(() => TransactionDto)
  trace?: TransactionDto;

  @ValidateNested()
  @IsOptional()
  @Column(() => UrlDto)
  @Type(() => UrlDto)
  url?: UrlDto;

  @ValidateNested()
  @IsOptional()
  @ApiHideProperty()
  @Column(() => UserDto)
  @Type(() => UserDto)
  user?: UserDto;

  @IsOptional()
  @IsBoolean()
  @ApiHideProperty()
  @Column()
  valid?: boolean;

  @IsOptional()
  @IsString()
  @Column()
  vaultEnvironment?: 'production' | 'test' | 'development' | 'tools';

  @IsOptional()
  @IsString()
  @Column()
  vaultInstance?: 'production' | 'test' | 'development';
}
