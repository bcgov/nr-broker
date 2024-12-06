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
import { UrlDto } from './url.dto';
import { ArtifactDto } from './artifact.dto';
import { ActionSourceDto } from './action-source.dto';
import { UserDto } from './user.dto';

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
export type ActionName = (typeof ACTION_NAMES)[number];

export function isActionName(actionName: string): actionName is ActionName {
  return ACTION_NAMES.includes(actionName as ActionName);
}

export const VAULT_ENVIRONMENT_NAMES = [
  'production',
  'test',
  'development',
  'tools',
];
export type VaultEnvironmentName = (typeof VAULT_ENVIRONMENT_NAMES)[number];

export const VAULT_INSTANCE_NAMES = ['production', 'test', 'development'];
export type VaultInstanceName = (typeof VAULT_INSTANCE_NAMES)[number];

export enum LIFECYCLE_NAMES {
  STARTED = 'started',
  ENDED = 'ended',
}

export class ActionDto {
  @IsString()
  @IsIn(ACTION_NAMES)
  action: ActionName;

  @IsString()
  @IsDefined()
  id: string;

  @ValidateNested()
  @IsOptional()
  @IsArray()
  @Type(() => ArtifactDto)
  artifacts?: ArtifactDto[];

  @IsArray()
  @IsDefined()
  provision: string[];

  @ValidateNested()
  @IsOptional()
  @Type(() => CloudDto)
  cloud?: CloudDto;

  @ValidateNested()
  @IsDefined()
  @Type(() => IntentionServiceDto)
  service: IntentionServiceDto;

  @IsOptional()
  @IsString()
  lifecycle?: 'started' | 'ended';

  @ValidateNested()
  @IsOptional()
  @Type(() => PackageDto)
  package?: PackageDto;

  @ValidateNested()
  @IsOptional()
  @Type(() => ActionSourceDto)
  source?: ActionSourceDto;

  // @ValidateNested()
  // @IsOptional()
  // @Type(() => TransactionDto)
  // transaction?: TransactionDto;

  // @ValidateNested()
  // @IsOptional()
  // @Type(() => TransactionDto)
  // trace?: TransactionDto;

  @ValidateNested()
  @IsOptional()
  @Type(() => UrlDto)
  url?: UrlDto;

  @ValidateNested()
  @IsOptional()
  @Type(() => UserDto)
  user?: UserDto;

  // @IsOptional()
  // @IsBoolean()
  // @ApiHideProperty()
  // valid?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(VAULT_ENVIRONMENT_NAMES)
  vaultEnvironment?: VaultEnvironmentName;

  @IsOptional()
  @IsString()
  @IsIn(VAULT_INSTANCE_NAMES)
  vaultInstance?: VaultInstanceName;
}
