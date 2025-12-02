import { Injectable } from '@nestjs/common';
import { BaseValidationRule } from '../validation-rule.interface';
import { DecisionContext, DecisionResult } from '../decision-context.interface';

/**
 * Validation Rule: User Set Validation
 *
 * DMN Decision: Verify that the action has a valid user mapping
 *
 * Business Rule: All actions must be mapped to a valid user unless
 * the account has skipUserValidation enabled.
 *
 * Drools equivalent would check:
 * - IF account.skipUserValidation == false
 * - AND user == null
 * - THEN fail with user.id violation
 */
@Injectable()
export class UserSetValidationRule extends BaseValidationRule {
  getRuleName(): string {
    return 'user-set-validation';
  }

  getPriority(): number {
    return 10; // Execute early - cheap validation
  }

  async evaluate(context: DecisionContext): Promise<DecisionResult> {
    if (context.account && context.account.skipUserValidation) {
      return this.pass();
    }

    if (!context.user) {
      return this.fail(
        'Unknown user. All actions required to be mapped to user. Does user exist with provided id or name and domain?',
        'user.id',
      );
    }

    return this.pass();
  }
}
