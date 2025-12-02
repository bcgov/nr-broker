import { Injectable } from '@nestjs/common';
import { ValidationRule } from './validation-rule.interface';
import { DecisionContext } from './decision-context.interface';
import { ActionRuleViolationEmbeddable } from '../entity/action-rule-violation.embeddable';
import {
  UserSetValidationRule,
  VaultEnvValidationRule,
  AccountBoundProjectValidationRule,
  TargetServiceValidationRule,
  DatabaseAccessValidationRule,
  PackageBuildValidationRule,
  PackageInstallationValidationRule,
} from './rules';

/**
 * Validation Rule Engine
 *
 * Orchestrates the execution of validation rules against a decision context.
 * This service acts as a DMN decision engine, executing rules in priority order
 * and short-circuiting on first failure.
 *
 * In a Drools migration, this would be replaced by:
 * - KieContainer to load DRL rules
 * - KieSession to execute rules against Working Memory
 * - StatelessKieSession for stateless validation
 *
 * Current implementation uses dependency injection to register rules,
 * but could be extended to load rules dynamically from configuration.
 */
@Injectable()
export class ValidationRuleEngine {
  private rules: ValidationRule[];

  constructor(
    // Inject all validation rules
    private readonly userSetValidationRule: UserSetValidationRule,
    private readonly vaultEnvValidationRule: VaultEnvValidationRule,
    private readonly accountBoundProjectValidationRule: AccountBoundProjectValidationRule,
    private readonly targetServiceValidationRule: TargetServiceValidationRule,
    private readonly databaseAccessValidationRule: DatabaseAccessValidationRule,
    private readonly packageBuildValidationRule: PackageBuildValidationRule,
    private readonly packageInstallationValidationRule: PackageInstallationValidationRule,
  ) {
    // Register all rules and sort by priority
    this.rules = [
      this.userSetValidationRule,
      this.vaultEnvValidationRule,
      this.accountBoundProjectValidationRule,
      this.targetServiceValidationRule,
      this.databaseAccessValidationRule,
      this.packageBuildValidationRule,
      this.packageInstallationValidationRule,
    ].sort((a, b) => {
      const priorityA = a.getPriority?.() ?? 100;
      const priorityB = b.getPriority?.() ?? 100;
      return priorityA - priorityB;
    });
  }

  /**
   * Execute all validation rules against the provided decision context.
   * Rules are executed in priority order and stop on first failure.
   *
   * @param context - The decision context containing all facts for validation
   * @returns ActionRuleViolationEmbeddable if any rule fails, null if all pass
   */
  async validate(
    context: DecisionContext,
  ): Promise<ActionRuleViolationEmbeddable | null> {
    for (const rule of this.rules) {
      const result = await rule.evaluate(context);

      if (!result.valid) {
        return new ActionRuleViolationEmbeddable(result.message, result.key);
      }
    }

    return null;
  }

  /**
   * Get all registered rules (useful for debugging/testing)
   */
  getRules(): ValidationRule[] {
    return [...this.rules];
  }
}
