import { Injectable } from '@nestjs/common';
import { BaseValidationRule } from '../validation-rule.interface';
import { DecisionContext, DecisionResult } from '../decision-context.interface';

/**
 * Validation Rule: Target Service Validation
 *
 * DMN Decision: Verify that the action's target service is configured
 *
 * Business Rule: When an action specifies a target service, validate that
 * the target service exists in the list of valid target services.
 *
 * Drools equivalent would check:
 * - IF action.service.target is defined
 * - AND action.service.target.name not in targetServices
 * - THEN fail with service.target.name violation
 */
@Injectable()
export class TargetServiceValidationRule extends BaseValidationRule {
  getRuleName(): string {
    return 'target-service-validation';
  }

  getPriority(): number {
    return 40; // Execute early - cheap validation
  }

  async evaluate(context: DecisionContext): Promise<DecisionResult> {
    if (!context.action.service.target) {
      return this.pass();
    }

    const targetServiceFound =
      context.targetServices.indexOf(context.action.service.target.name) !==
      -1;

    if (targetServiceFound) {
      return this.pass();
    } else {
      return this.fail(
        'Service not configured for target',
        'service.target.name',
      );
    }
  }
}
