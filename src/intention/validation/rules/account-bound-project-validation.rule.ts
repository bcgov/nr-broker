import { Injectable } from '@nestjs/common';
import { BaseValidationRule } from '../validation-rule.interface';
import { DecisionContext, DecisionResult } from '../decision-context.interface';

/**
 * Validation Rule: Account Bound Project Validation
 *
 * DMN Decision: Verify that the action's project and service are authorized
 * for the requesting account
 *
 * Business Rule: When an account has project/service restrictions,
 * validate that the action's project and service are in the allowed list.
 *
 * Drools equivalent would check:
 * - IF accountBoundProjects is defined
 * - AND requireProjectExists is true
 * - AND project not in accountBoundProjects
 * - THEN fail with service.project violation
 *
 * - IF accountBoundProjects is defined
 * - AND requireServiceExists is true
 * - AND service not in accountBoundProjects[project].services
 * - THEN fail with service.name violation
 */
@Injectable()
export class AccountBoundProjectValidationRule extends BaseValidationRule {
  getRuleName(): string {
    return 'account-bound-project-validation';
  }

  getPriority(): number {
    return 30; // Execute early - cheap validation
  }

  async evaluate(context: DecisionContext): Promise<DecisionResult> {
    if (context.accountBoundProjects) {
      const service = context.action.service;
      const projectFound = !!context.accountBoundProjects[service.project];
      const serviceFound =
        projectFound &&
        context.accountBoundProjects[service.project].services.indexOf(
          service.name,
        ) !== -1;

      if (!projectFound && context.requireProjectExists) {
        return this.fail(
          'Token not authorized for this project',
          'service.project',
        );
      }

      if (!serviceFound && context.requireServiceExists) {
        return this.fail(
          'Token not authorized for this service',
          'service.name',
        );
      }
    }

    return this.pass();
  }
}
