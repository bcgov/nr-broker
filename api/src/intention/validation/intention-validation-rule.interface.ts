import {
  IntentionDecisionContext,
  IntentionDecisionResult,
} from './intention-decision-context.interface';

/**
 * Base interface for intention-level validation rules.
 * These rules evaluate before individual actions are validated.
 *
 * When migrating to Drools, each implementation would map to a
 * high-priority DRL rule or DMN decision that gates intention opening.
 */
export interface IntentionValidationRule {
  /**
   * Unique identifier for this rule
   */
  getRuleName(): string;

  /**
   * Evaluate the rule against the intention-level decision context
   */
  evaluate(
    context: IntentionDecisionContext,
  ): Promise<IntentionDecisionResult>;

  /**
   * Optional priority/order for rule execution
   */
  getPriority?(): number;
}

/**
 * Abstract base class for intention-level validation rules
 */
export abstract class BaseIntentionValidationRule implements IntentionValidationRule {
  abstract getRuleName(): string;
  abstract evaluate(
    context: IntentionDecisionContext,
  ): Promise<IntentionDecisionResult>;

  getPriority(): number {
    return 100;
  }

  protected pass(): IntentionDecisionResult {
    return { valid: true };
  }

  protected fail(
    message: string,
    key: string,
    data?: any,
  ): IntentionDecisionResult {
    return { valid: false, message, key, data };
  }
}
