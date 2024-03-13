import { Column } from 'typeorm';
import {
  IsBoolean,
  IsDefined,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VaultActorPoliciesDto {
  @Column()
  approle: {
    [key: string]: ReadonlyArray<string>;
  };
  @Column()
  developer: {
    [key: string]: ReadonlyArray<string>;
  };
}

/* eslint-disable camelcase -- Library code style issue */
export class VaultConfigApproleDto {
  // non-standard
  @IsBoolean()
  @Column()
  enabled: boolean;
  // standard
  @IsBoolean()
  @Column()
  bind_secret_id: boolean;
  @Column()
  secret_id_bound_cidrs: string | string[];
  @IsNumber()
  @Column()
  secret_id_num_uses: number;
  @Column()
  secret_id_ttl: number | string;
  @Column()
  enable_local_secret_ids: boolean;
  @Column()
  token_ttl: number | string;
  @Column()
  token_max_ttl: number | string;
  @Column()
  token_policies: string | string[];
  @Column()
  token_bound_cidrs: string | string[];
  @Column()
  token_explicit_max_ttl: number | string;
  @IsBoolean()
  @Column()
  token_no_default_policy: boolean;
  @Column()
  token_num_uses: number;
  @Column()
  token_period: number | string;
  @IsString()
  @Column()
  token_type: string;
}
/* eslint-enable camelcase */

export class VaultPolicyOptions {
  /** True if an application kv policies should be able to read project kv secrets */
  @IsOptional()
  @IsBoolean()
  @Column()
  kvReadProject?: boolean;
  /** Global policies to add to every environment */
  @IsOptional()
  @Column()
  systemPolicies?: string[];
  /** Token expiration policy. The default is daily. */
  @IsString()
  @Column()
  tokenPeriod?: 'hourly' | 'bidaily' | 'daily' | 'weekly';
}

export class VaultConfigDto {
  /** Per-environment overrides of policies for each type of actor */
  @IsOptional()
  @Column(() => VaultActorPoliciesDto)
  @Type(() => VaultActorPoliciesDto)
  actor?: VaultActorPoliciesDto;
  /** How to configure the approle for this application */
  @IsOptional()
  @Column(() => VaultConfigApproleDto, { array: true })
  @Type(() => VaultConfigApproleDto)
  approle?: VaultConfigApproleDto;
  /** This application may broker logins for all other applications */
  @IsOptional()
  @Column()
  brokerGlobal?: boolean;
  /** Array of applications this application may login for */
  @IsOptional()
  @Column()
  brokerFor?: string[];
  /** Array of databases this application has access to */
  @IsOptional()
  @Column()
  db?: string[];
  /** True if this application, policies, groups will be generated. */

  @IsBoolean()
  @IsDefined()
  @Column()
  enabled: boolean;

  /** Options that alter the content of policies. */
  @IsOptional()
  @Column()
  policyOptions?: VaultPolicyOptions;
}
