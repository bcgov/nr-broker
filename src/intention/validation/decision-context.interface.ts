import { IntentionEntity } from '../entity/intention.entity';
import { ActionEmbeddable } from '../entity/action.embeddable';
import { BrokerAccountEntity } from '../../persistence/entity/broker-account.entity';
import { BrokerAccountProjectMapDto } from '../../persistence/dto/graph-data.dto';
import { UserEntity } from '../../persistence/entity/user.entity';

/**
 * Decision Context (DMN-compatible) representing the complete state
 * needed for action validation. This interface defines the "facts"
 * that validation rules will evaluate against.
 *
 * In a Drools implementation, this would map to Working Memory facts.
 */
export interface IDecisionContext {
  /**
   * The intention being validated
   */
  intention: IntentionEntity;

  /**
   * The specific action within the intention to validate
   */
  action: ActionEmbeddable;

  /**
   * The broker account making the request (may be null)
   */
  account: BrokerAccountEntity | null;

  /**
   * Project-to-service mappings for account-bound projects
   */
  accountBoundProjects: BrokerAccountProjectMapDto | null;

  /**
   * The user associated with the action
   */
  user: UserEntity | null;

  /**
   * List of valid target services for this action
   */
  targetServices: string[];

  /**
   * Whether the project must exist for validation
   */
  requireProjectExists: boolean;

  /**
   * Whether the service must exist for validation
   */
  requireServiceExists: boolean;
}

/**
 * Decision Result from a validation rule evaluation.
 * In DMN/Drools terminology, this represents the output of a decision.
 */
export interface IDecisionResult {
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
}
