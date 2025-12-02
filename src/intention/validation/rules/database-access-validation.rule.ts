import { Injectable } from '@nestjs/common';
import { BaseValidationRule } from '../validation-rule.interface';
import { IDecisionContext, IDecisionResult } from '../decision-context.interface';
import { DatabaseAccessActionEmbeddable } from '../../entity/database-access-action.embeddable';
import { AssistedDeliveryValidationRule } from './assisted-delivery-validation.rule';
import { UserSetValidationRule } from './user-set-validation.rule';

/**
 * Validation Rule: Database Access Action Validation
 *
 * DMN Decision: Verify database access actions meet business requirements
 *
 * Business Rule: Database access actions require valid user mapping
 * and authorized delivery permissions.
 *
 * Drools equivalent would check:
 * - IF action is DatabaseAccessAction
 * - THEN validate user is set (even if skipUserValidation is true)
 * - AND validate assisted delivery authorization
 */
@Injectable()
export class DatabaseAccessValidationRule extends BaseValidationRule {
  constructor(
    private readonly userSetValidationRule: UserSetValidationRule,
    private readonly assistedDeliveryValidationRule: AssistedDeliveryValidationRule,
  ) {
    super();
  }

  getRuleName(): string {
    return 'database-access-validation';
  }

  getPriority(): number {
    return 50; // Execute after basic validations
  }

  async evaluate(context: IDecisionContext): Promise<IDecisionResult> {
    if (!(context.action instanceof DatabaseAccessActionEmbeddable)) {
      return this.pass();
    }

    // Ensure user validation done. May have been skipped if option set.
    const userValidationContext: IDecisionContext = {
      ...context,
      account: null, // Force user validation even if skipUserValidation is true
    };
    const userValidation =
      await this.userSetValidationRule.evaluate(userValidationContext);

    if (!userValidation.valid) {
      return userValidation;
    }

    return this.assistedDeliveryValidationRule.evaluate(context);
  }
}
