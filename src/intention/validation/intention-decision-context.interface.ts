import { BrokerAccountEntity } from '../../persistence/entity/broker-account.entity';
import { JwtRegistryEntity } from '../../persistence/entity/jwt-registry.entity';
import { BrokerJwtEmbeddable } from '../../auth/broker-jwt.embeddable';

/**
 * Intention-Level Decision Context
 *
 * DMN-compatible context for intention-level validations that occur
 * before individual actions are validated. These are high-level business
 * rules about whether an intention can be opened at all.
 *
 * In a Drools implementation, this would map to Working Memory facts
 * for intention-level rules that execute before action-level rules.
 */
export interface IntentionDecisionContext {
  /**
   * The JWT extracted from the request
   */
  brokerJwt: BrokerJwtEmbeddable | null;

  /**
   * The JWT registry entry (if found)
   */
  registryJwt: JwtRegistryEntity | null;

  /**
   * The broker account associated with the JWT
   */
  account: BrokerAccountEntity | null;
}

/**
 * Decision Result from an intention-level validation rule evaluation.
 */
export interface IntentionDecisionResult {
  /**
   * Whether the validation passed (true) or failed (false)
   */
  valid: boolean;

  /**
   * If validation failed, contains the violation message
   */
  message?: string;

  /**
   * If validation failed, contains the key/field that failed
   */
  key?: string;

  /**
   * Additional error data (optional)
   */
  data?: any;
}
