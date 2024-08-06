import { Column } from 'typeorm';
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
import { Type } from 'class-transformer';

export class VaultActorPoliciesDto {
  @IsOptional()
  @Column()
  approle?: {
    [key: string]: ReadonlyArray<string>;
  };
  @IsOptional()
  @Column()
  developer?: {
    [key: string]: ReadonlyArray<string>;
  };
}

export class VaultConfigApproleDto {
  // non-standard
  @IsBoolean()
  @Column()
  enabled: boolean;
  // standard
  @IsBoolean()
  @IsOptional()
  @Column()
  bind_secret_id?: boolean;
  @IsOptional()
  @Column()
  secret_id_bound_cidrs?: string | string[];
  @IsOptional()
  @IsNumber()
  @Column()
  secret_id_num_uses?: number;
  @IsOptional()
  @Column()
  secret_id_ttl?: number | string;
  @IsOptional()
  @Column()
  enable_local_secret_ids?: boolean;
  @IsOptional()
  @Column()
  token_ttl?: number | string;
  @IsOptional()
  @Column()
  token_max_ttl?: number | string;
  @IsOptional()
  @Column()
  token_policies?: string | string[];
  @IsOptional()
  @Column()
  token_bound_cidrs?: string | string[];
  @IsOptional()
  @Column()
  token_explicit_max_ttl?: number | string;
  @IsOptional()
  @IsBoolean()
  @Column()
  token_no_default_policy?: boolean;
  @IsOptional()
  @Column()
  token_num_uses?: number;
  @IsOptional()
  @Column()
  token_period?: number | string;
  @IsOptional()
  @IsString()
  @Column()
  token_type?: string;
}

export class VaultPolicyOptions {
  /** True if an application kv policies should be able to read project kv secrets */
  @IsOptional()
  @IsBoolean()
  @Column()
  kvReadProject?: boolean;
  /** Global policies to add to every environment */
  @IsOptional()
  @IsArray()
  @Column()
  systemPolicies?: string[];
  /** Token expiration policy. The default is daily. */
  @IsOptional()
  @IsString()
  @IsIn(['hourly', 'bidaily', 'daily', 'weekly'])
  @Column()
  tokenPeriod?: 'hourly' | 'bidaily' | 'daily' | 'weekly';
}

export class VaultConfigDto {
  /** Per-environment overrides of policies for each type of actor */
  @ValidateNested()
  @IsOptional()
  @Column(() => VaultActorPoliciesDto)
  @Type(() => VaultActorPoliciesDto)
  actor?: VaultActorPoliciesDto;
  /** How to configure the approle for this application */
  @ValidateNested()
  @IsOptional()
  @Column(() => VaultConfigApproleDto)
  @Type(() => VaultConfigApproleDto)
  approle?: VaultConfigApproleDto;
  /** This application may broker logins for all other applications */
  @IsOptional()
  @IsBoolean()
  @Column()
  brokerGlobal?: boolean;
  /** Array of applications this application may login for */
  @IsOptional()
  @IsArray()
  @Column()
  brokerFor?: string[];
  /** Array of databases this application has access to */
  @IsOptional()
  @IsArray()
  @Column()
  db?: string[];
  /** True if this application, policies, groups will be generated. */

  @IsBoolean()
  @IsDefined()
  @Column()
  enabled: boolean;

  /** Options that alter the content of policies. */
  @ValidateNested()
  @IsOptional()
  @Column(() => VaultPolicyOptions)
  @Type(() => VaultPolicyOptions)
  policyOptions?: VaultPolicyOptions;
}
