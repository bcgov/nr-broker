import { Embeddable, Property } from '@mikro-orm/core';

@Embeddable()
export class VaultActorPoliciesDto {
  @Property()
  approle?: {
    [key: string]: ReadonlyArray<string>;
  };
  @Property()
  developer?: {
    [key: string]: ReadonlyArray<string>;
  };
}

@Embeddable()
export class VaultConfigApproleDto {
  // non-standard
  @Property()
  enabled: boolean;
  // standard
  @Property({ nullable: true })
  bind_secret_id?: boolean;
  @Property({ nullable: true })
  secret_id_bound_cidrs?: string | string[];
  @Property({ nullable: true })
  secret_id_num_uses?: number;
  @Property({ nullable: true })
  secret_id_ttl?: number | string;
  @Property({ nullable: true })
  enable_local_secret_ids?: boolean;
  @Property({ nullable: true })
  token_ttl?: number | string;
  @Property({ nullable: true })
  token_max_ttl?: number | string;
  @Property({ nullable: true })
  token_policies?: string | string[];
  @Property({ nullable: true })
  token_bound_cidrs?: string | string[];
  @Property({ nullable: true })
  token_explicit_max_ttl?: number | string;
  @Property({ nullable: true })
  token_no_default_policy?: boolean;
  @Property({ nullable: true })
  token_num_uses?: number;
  @Property({ nullable: true })
  token_period?: number | string;
  @Property({ nullable: true })
  token_type?: string;
}

@Embeddable()
export class VaultPolicyOptions {
  /** True if an application kv policies should be able to read project kv secrets */
  @Property({ nullable: true })
  kvReadProject?: boolean;
  /** Global policies to add to every environment */
  @Property({ nullable: true })
  systemPolicies?: string[];
  /** Token expiration policy. The default is daily. */
  @Property({ nullable: true })
  tokenPeriod?: 'hourly' | 'bidaily' | 'daily' | 'weekly';
}

@Embeddable()
export class VaultConfigDto {
  /** Per-environment overrides of policies for each type of actor */
  @Property({ nullable: true })
  actor?: VaultActorPoliciesDto;
  /** How to configure the approle for this application */
  @Property({ nullable: true })
  approle?: VaultConfigApproleDto;
  /** This application may broker logins for all other applications */
  @Property({ nullable: true })
  brokerGlobal?: boolean;
  /** Array of applications this application may login for */
  @Property({ nullable: true })
  brokerFor?: string[];
  /** Array of databases this application has access to */
  @Property({ nullable: true })
  db?: string[];
  /** True if this application, policies, groups will be generated. */

  @Property()
  enabled: boolean;

  /** Options that alter the content of policies. */
  @Property({ nullable: true })
  policyOptions?: VaultPolicyOptions;
}
