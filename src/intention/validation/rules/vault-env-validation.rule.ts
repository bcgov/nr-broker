import { Injectable } from '@nestjs/common';
import { BaseValidationRule } from '../validation-rule.interface';
import { IDecisionContext, IDecisionResult } from '../decision-context.interface';
import { ActionUtil } from '../../../util/action.util';

/**
 * Validation Rule: Vault Environment Validation
 *
 * DMN Decision: Verify that provisioned actions specify a valid Vault environment
 *
 * Business Rule: When an action provisions secrets, the Vault environment must be
 * one of: production, test, or development. If the service environment is not valid
 * for Vault, action.vaultEnvironment must be explicitly set.
 *
 * Drools equivalent would check:
 * - IF action requires provisioning
 * - AND vaultEnvironment not in (production, test, development)
 * - THEN fail with service.environment or service.target.environment violation
 */
@Injectable()
export class VaultEnvValidationRule extends BaseValidationRule {
  constructor(private readonly actionUtil: ActionUtil) {
    super();
  }

  getRuleName(): string {
    return 'vault-env-validation';
  }

  getPriority(): number {
    return 20; // Execute early - cheap validation
  }

  async evaluate(context: IDecisionContext): Promise<IDecisionResult> {
    if (
      this.actionUtil.isProvisioned(context.action) &&
      !this.actionUtil.isValidVaultEnvironment(context.action)
    ) {
      return this.fail(
        'Explicitly set action.vaultEnvironment when service environment is not valid for Vault. Vault environment must be production, test or development.',
        context.action.service.target?.environment
          ? 'service.target.environment'
          : 'service.environment',
      );
    }

    return this.pass();
  }
}
