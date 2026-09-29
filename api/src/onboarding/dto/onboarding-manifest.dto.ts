import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDefined,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class OnboardingProjectDto {
  @IsString()
  @IsDefined()
  name!: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class OnboardingServiceDto {
  @IsString()
  @IsDefined()
  name!: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class OnboardingRepositoryDto {
  @IsString()
  @IsDefined()
  name!: string;

  @IsString()
  @IsDefined()
  scmUrl!: string;

  @IsBoolean()
  @IsOptional()
  enableSyncSecrets?: boolean;

  @IsBoolean()
  @IsOptional()
  enableSyncUsers?: boolean;
}

/**
 * Everything "Set up NR Broker for a new application" asks for, except the
 * broker account and team, which are the caller's own.
 */
export class OnboardingManifestDto {
  @ValidateNested()
  @IsDefined()
  @Type(() => OnboardingProjectDto)
  project!: OnboardingProjectDto;

  @ValidateNested()
  @IsDefined()
  @Type(() => OnboardingServiceDto)
  service!: OnboardingServiceDto;

  /** Existing environment names, e.g. development, test, production. */
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  environments!: string[];

  @ValidateNested()
  @IsOptional()
  @Type(() => OnboardingRepositoryDto)
  repository?: OnboardingRepositoryDto;

  /** Provision-token services to connect; each must be on the allowlist. */
  @IsArray()
  @IsOptional()
  @ArrayUnique()
  @IsString({ each: true })
  provisionTokens?: string[];

  /**
   * Broker account to authorize for the project. Token callers may omit it
   * (their own account is used) and may not name another account. Admin
   * sessions must name one.
   */
  @IsString()
  @IsOptional()
  account?: string;
}
