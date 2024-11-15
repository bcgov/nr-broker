import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Embeddable, Property } from '@mikro-orm/core';
import { Type } from 'class-transformer';

export class VaultActorPoliciesDto {
  @IsOptional()
  @Property()
  approle?: {
    [key: string]: ReadonlyArray<string>;
  };
  @IsOptional()
  @Property()
  developer?: {
    [key: string]: ReadonlyArray<string>;
  };
}

export class VaultConfigApproleDto {
  // non-standard
  @IsBoolean()
  @Property()
  enabled: boolean;
  // standard
  @IsBoolean()
  @IsOptional()
  @Property()
  bind_secret_id?: boolean;
  @IsOptional()
  @Property()
  secret_id_bound_cidrs?: string | string[];
  @IsOptional()
  @IsNumber()
  @Property()
  secret_id_num_uses?: number;
  @IsOptional()
  @Property()
  secret_id_ttl?: number | string;
  @IsOptional()
  @Property()
  enable_local_secret_ids?: boolean;
  @IsOptional()
  @Property()
  token_ttl?: number | string;
  @IsOptional()
  @Property()
  token_max_ttl?: number | string;
  @IsOptional()
  @Property()
  token_policies?: string | string[];
  @IsOptional()
  @Property()
  token_bound_cidrs?: string | string[];
  @IsOptional()
  @Property()
  token_explicit_max_ttl?: number | string;
  @IsOptional()
  @IsBoolean()
  @Property()
  token_no_default_policy?: boolean;
  @IsOptional()
  @Property()
  token_num_uses?: number;
  @IsOptional()
  @Property()
  token_period?: number | string;
  @IsOptional()
  @IsString()
  @Property()
  token_type?: string;
}

export class VaultPolicyOptions {
  /** True if an application kv policies should be able to read project kv secrets */
  @IsOptional()
  @IsBoolean()
  @Property()
  kvReadProject?: boolean;
  /** Global policies to add to every environment */
  @IsOptional()
  @IsArray()
  @Property()
  systemPolicies?: string[];
  /** Token expiration policy. The default is daily. */
  @IsOptional()
  @IsString()
  @IsIn(['hourly', 'bidaily', 'daily', 'weekly'])
  @Property()
  tokenPeriod?: 'hourly' | 'bidaily' | 'daily' | 'weekly';
}

@Embeddable()
export class VaultConfigDto {
  /** Per-environment overrides of policies for each type of actor */
  @ValidateNested()
  @IsOptional()
  @Property()
  @Type(() => VaultActorPoliciesDto)
  actor?: VaultActorPoliciesDto;
  /** How to configure the approle for this application */
  @ValidateNested()
  @IsOptional()
  @Property()
  @Type(() => VaultConfigApproleDto)
  approle?: VaultConfigApproleDto;
  /** This application may broker logins for all other applications */
  @IsOptional()
  @IsBoolean()
  @Property()
  brokerGlobal?: boolean;
  /** Array of applications this application may login for */
  @IsOptional()
  @IsArray()
  @Property()
  brokerFor?: string[];
  /** Array of databases this application has access to */
  @IsOptional()
  @IsArray()
  @Property()
  db?: string[];
  /** True if this application, policies, groups will be generated. */

  @IsBoolean()
  @IsDefined()
  @Property()
  enabled: boolean;

  /** Options that alter the content of policies. */
  @ValidateNested()
  @IsOptional()
  @Property()
  @Type(() => VaultPolicyOptions)
  policyOptions?: VaultPolicyOptions;
}
