import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { IntentionServiceDto } from './intention-service.dto';
import { CloudDto } from './cloud.dto';
import { PackageDto } from './package.dto';
import { ArtifactDto } from './artifact.dto';
import { ActionSourceDto } from './action-source.dto';
import { UserDto } from './user.dto';
import { TransactionDto } from './transaction.dto';
import { ENVIRONMENT_NAMES } from './constants.dto';
import { ActionRuleViolationDto } from './action-rule-violation.dto';

export enum ACTION_NAMES {
  BACKUP = 'backup',
  DATABASE_ACCESS = 'database-access',
  SERVER_ACCESS = 'server-access',
  PACKAGE_BUILD = 'package-build',
  PACKAGE_CONFIGURE = 'package-configure',
  PACKAGE_INSTALLATION = 'package-installation',
  PACKAGE_PROVISION = 'package-provision',
  PROCESS_END = 'process-end',
  PROCESS_START = 'process-start',
}

export enum LIFECYCLE_NAMES {
  STARTED = 'started',
  ENDED = 'ended',
}

export class ActionDto {
  @IsString()
  @IsIn(Object.values(ACTION_NAMES))
  action!: ACTION_NAMES;

  @IsString()
  @IsDefined()
  id!: string;

  @ValidateNested()
  @IsOptional()
  @IsArray()
  @Type(() => ArtifactDto)
  artifacts?: ArtifactDto[];

  @IsArray()
  @IsDefined()
  provision!: string[];

  @ValidateNested()
  @IsOptional()
  @Type(() => CloudDto)
  cloud?: CloudDto;

  @ValidateNested()
  @IsDefined()
  @Type(() => IntentionServiceDto)
  service!: IntentionServiceDto;

  @IsOptional()
  @IsString()
  lifecycle?: LIFECYCLE_NAMES;

  @ValidateNested()
  @IsOptional()
  @Type(() => PackageDto)
  package?: PackageDto;

  @ValidateNested()
  @IsOptional()
  @Type(() => ActionSourceDto)
  source?: ActionSourceDto;

  @ValidateNested()
  @IsOptional()
  @Type(() => TransactionDto)
  trace?: TransactionDto;

  @ValidateNested()
  @IsOptional()
  @Type(() => UserDto)
  user?: UserDto;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(ENVIRONMENT_NAMES))
  vaultEnvironment?: ENVIRONMENT_NAMES;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(ENVIRONMENT_NAMES))
  vaultInstance?: ENVIRONMENT_NAMES;

  @ValidateNested()
  @IsOptional()
  @Type(() => ActionRuleViolationDto)
  ruleViolation?: ActionRuleViolationDto;
}
