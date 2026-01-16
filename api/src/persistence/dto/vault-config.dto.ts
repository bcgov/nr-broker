// Shared DTO: Copy in back-end and front-end should be identical

import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  registerDecorator,
  ValidateNested,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export enum TOKEN_PERIODS {
  HOURLY = 'hourly',
  BIDAILY = 'bidaily',
  DAILY = 'daily',
  WEEKLY = 'weekly',
}

@ValidatorConstraint({ async: false })
class IsStringOrNumberConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    // Check if the value is a string or a number
    return typeof value === 'string' || typeof value === 'number';
  }

  defaultMessage(): string {
    return 'Value must be a string or a number';
  }
}

export function IsStringOrNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStringOrNumberConstraint,
    });
  };
}

@ValidatorConstraint({ async: false })
class IsStringOrStringArrayConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value === 'string') return true; // Valid if it's a string
    if (
      Array.isArray(value) &&
      value.every((item) => typeof item === 'string')
    ) {
      return true; // Valid if it's an array of strings
    }
    return false; // Invalid for anything else
  }

  defaultMessage(): string {
    return 'The value must be a string or an array of strings';
  }
}

export function IsStringOrStringArray(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStringOrStringArrayConstraint,
    });
  };
}

export class VaultActorPoliciesDto {
  @IsDefined()
  approle!: Record<string, readonly string[]>;
  @IsDefined()
  developer!: Record<string, readonly string[]>;
}

export class VaultConfigApproleDto {
  // non-standard
  @IsBoolean()
  @IsDefined()
  enabled!: boolean;

  // standard
  @IsBoolean()
  @IsOptional()
  bind_secret_id?: boolean;

  @IsOptional()
  @IsStringOrStringArray()
  secret_id_bound_cidrs?: string | string[];

  @IsNumber()
  @IsOptional()
  secret_id_num_uses?: number;

  @IsOptional()
  @IsStringOrNumber()
  secret_id_ttl?: number | string;

  @IsBoolean()
  @IsOptional()
  enable_local_secret_ids?: boolean;

  @IsOptional()
  @IsStringOrNumber()
  token_ttl?: number | string;

  @IsOptional()
  @IsStringOrNumber()
  token_max_ttl?: number | string;

  @IsOptional()
  @IsStringOrStringArray()
  token_policies?: string | string[];

  @IsOptional()
  @IsStringOrStringArray()
  token_bound_cidrs?: string | string[];

  @IsOptional()
  @IsStringOrNumber()
  token_explicit_max_ttl?: number | string;

  @IsBoolean()
  @IsOptional()
  token_no_default_policy?: boolean;

  @IsNumber()
  @IsOptional()
  token_num_uses?: number;

  @IsOptional()
  @IsStringOrNumber()
  token_period?: number | string;

  @IsOptional()
  @IsString()
  token_type?: string;
}

export class VaultPolicyOptionsRest {
  /** True if an application kv policies should be able to read project kv secrets */
  @IsBoolean()
  @IsOptional()
  kvReadProject?: boolean;

  /** Global policies to add to every environment */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  systemPolicies?: string[];

  /** Token expiration policy. The default is daily. */
  @IsOptional()
  @IsString()
  @IsIn(Object.values(TOKEN_PERIODS))
  tokenPeriod?: 'hourly' | 'bidaily' | 'daily' | 'weekly';
}

export class VaultConfigDto {
  /** Per-environment overrides of policies for each type of actor */
  @IsOptional()
  @ValidateNested()
  @Type(() => VaultActorPoliciesDto)
  actor?: VaultActorPoliciesDto;

  /** How to configure the approle for this application */
  @IsOptional()
  @ValidateNested()
  @Type(() => VaultConfigApproleDto)
  approle?: VaultConfigApproleDto;

  /** This application may broker logins for all other applications */
  @IsOptional()
  @IsBoolean()
  brokerGlobal?: boolean;

  /** Array of applications this application may login for */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  brokerFor?: string[];

  /** Array of databases this application has access to */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  db?: string[];

  /** True if this application, policies, groups will be generated. */
  @IsDefined()
  @IsBoolean()
  enabled!: boolean;

  /** Options that alter the content of policies. */
  @IsOptional()
  @ValidateNested()
  @Type(() => VaultPolicyOptionsRest)
  policyOptions?: VaultPolicyOptionsRest;
}
