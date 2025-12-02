import { Injectable } from '@nestjs/common';
import { IIntentionValidationRule } from './intention-validation-rule.interface';
import { IIntentionDecisionContext } from './intention-decision-context.interface';
import {
  JwtBlockedValidationRule,
  AccountBindingValidationRule,
} from './intention-rules';

/**
 * Exception thrown when an intention-level validation rule fails
 */
export class IntentionValidationException extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly message: string,
    public readonly error: any,
    public readonly data?: any,
  ) {
    super(message);
    this.name = 'IntentionValidationException';
  }
}

/**
 * Intention Validation Rule Engine
 *
 * Orchestrates execution of intention-level validation rules.
 * These rules run before individual actions are validated and
 * determine whether an intention can be opened at all.
 *
 * In a Drools migration, this would be replaced by high-priority
 * rules in the same KieSession as action-level rules, or a separate
 * StatelessKieSession for pre-validation.
 */
@Injectable()
export class IntentionValidationRuleEngine {
  private rules: IIntentionValidationRule[];

  constructor(
    private readonly jwtBlockedValidationRule: JwtBlockedValidationRule,
    private readonly accountBindingValidationRule: AccountBindingValidationRule,
  ) {
    // Register all rules and sort by priority
    this.rules = [
      this.jwtBlockedValidationRule,
      this.accountBindingValidationRule,
    ].sort((a, b) => {
      const priorityA = a.getPriority?.() ?? 100;
      const priorityB = b.getPriority?.() ?? 100;
      return priorityA - priorityB;
    });
  }

  /**
   * Execute all intention-level validation rules.
   * Throws IntentionValidationException on first failure.
   *
   * @param context - The intention-level decision context
   * @throws IntentionValidationException if any rule fails
   */
  async validate(context: IIntentionDecisionContext): Promise<void> {
    for (const rule of this.rules) {
      const result = await rule.evaluate(context);

      if (!result.valid) {
        throw new IntentionValidationException(
          400,
          result.message,
          result.data ?? [],
          result.data,
        );
      }
    }
  }

  /**
   * Get all registered rules (useful for debugging/testing)
   */
  getRules(): IIntentionValidationRule[] {
    return [...this.rules];
  }
}
