import { Injectable } from '@nestjs/common';
import { BaseIntentionValidationRule } from '../intention-validation-rule.interface';
import {
  IIntentionDecisionContext,
  IIntentionDecisionResult,
} from '../intention-decision-context.interface';

/**
 * Validation Rule: Account Binding Check
 *
 * DMN Decision: Verify that the JWT is bound to a broker account
 *
 * Business Rule: All tokens must be associated with a valid broker account
 * to open intentions. This ensures proper authorization and auditing.
 *
 * Drools equivalent would check:
 * - IF account is null
 * - THEN fail with account binding error
 */
@Injectable()
export class AccountBindingValidationRule extends BaseIntentionValidationRule {
  getRuleName(): string {
    return 'account-binding-validation';
  }

  getPriority(): number {
    return 20; // Execute after JWT blocked check
  }

  async evaluate(
    context: IIntentionDecisionContext,
  ): Promise<IIntentionDecisionResult> {
    if (!context.account) {
      return this.fail(
        'Token must be bound to a broker account',
        'jwt.jti',
        {
          action: '',
          action_id: '',
          key: 'jwt.jti',
          value: context.brokerJwt?.jti,
        },
      );
    }

    return this.pass();
  }
}
