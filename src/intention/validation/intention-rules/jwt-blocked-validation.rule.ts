import { Injectable } from '@nestjs/common';
import { BaseIntentionValidationRule } from '../intention-validation-rule.interface';
import {
  IIntentionDecisionContext,
  IIntentionDecisionResult,
} from '../intention-decision-context.interface';

/**
 * Validation Rule: JWT Registry Blocked Check
 *
 * DMN Decision: Verify that the JWT is not blocked in the registry
 *
 * Business Rule: Blocked JWTs cannot be used to open intentions.
 * This is a backup check (primary check happens earlier in the request pipeline).
 *
 * Drools equivalent would check:
 * - IF registryJwt exists
 * - AND registryJwt.blocked == true
 * - THEN fail with authorization error
 */
@Injectable()
export class JwtBlockedValidationRule extends BaseIntentionValidationRule {
  getRuleName(): string {
    return 'jwt-blocked-validation';
  }

  getPriority(): number {
    return 10; // Execute early - cheap validation
  }

  async evaluate(
    context: IIntentionDecisionContext,
  ): Promise<IIntentionDecisionResult> {
    if (context.registryJwt && context.registryJwt.blocked) {
      return this.fail('Authorization failed', 'jwt.jti', []);
    }

    return this.pass();
  }
}
