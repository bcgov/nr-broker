import { IDecisionContext, IDecisionResult } from './decision-context.interface';

/**
 * Base interface for validation rules.
 * This interface is designed to be compatible with DMN/Drools rule engines.
 *
 * Each validation rule is a decision that evaluates a specific aspect
 * of the decision context and returns a decision result.
 *
 * When migrating to Drools, each implementation of this interface
 * would map to a DRL rule or DMN decision table.
 */
export interface IValidationRule {
  /**
   * Unique identifier for this rule (used for logging/debugging)
   */
  getRuleName(): string;

  /**
   * Evaluate the rule against the provided decision context.
   * Returns a decision result indicating pass/fail and violation details.
   *
   * @param context - The complete decision context containing all facts
   * @returns Promise resolving to the decision result
   */
  evaluate(context: IDecisionContext): Promise<IDecisionResult>;

  /**
   * Optional priority/order for rule execution.
   * Lower numbers execute first. Default is 100.
   * Useful for short-circuiting expensive validations.
   */
  getPriority?(): number;
}

/**
 * Abstract base class providing common functionality for validation rules.
 * Implements IValidationRule with helper methods for creating results.
 */
export abstract class BaseValidationRule implements IValidationRule {
  abstract getRuleName(): string;
  abstract evaluate(context: IDecisionContext): Promise<IDecisionResult>;

  /**
   * Get execution priority for this rule.
   * Override to customize rule ordering.
   */
  getPriority(): number {
    return 100;
  }

  /**
   * Helper method to create a passing decision result
   */
  protected pass(): IDecisionResult {
    return { valid: true };
  }

  /**
   * Helper method to create a failing decision result
   */
  protected fail(message: string, key: string): IDecisionResult {
    return { valid: false, message, key };
  }
}
