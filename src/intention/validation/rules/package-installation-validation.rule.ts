import { Injectable } from '@nestjs/common';
import { BaseValidationRule } from '../validation-rule.interface';
import { IDecisionContext, IDecisionResult } from '../decision-context.interface';
import { PackageInstallationActionEmbeddable } from '../../entity/package-installation-action.embeddable';
import { PersistenceUtilService } from '../../../persistence/persistence-util.service';
import { ActionUtil } from '../../../util/action.util';
import { ENVIRONMENT_NAMES } from '../../dto/constants.dto';
import { INTENTION_SERVICE_INSTANCE_SEARCH_PATHS } from '../../../constants';
import { AssistedDeliveryValidationRule } from './assisted-delivery-validation.rule';

/**
 * Validation Rule: Package Installation Action Validation
 *
 * DMN Decision: Verify package installation actions meet business requirements
 *
 * Business Rule:
 * - Must specify a valid environment
 * - Must have extractable service instance name
 * - Version must be valid semver (unless maskSemverFailures is true)
 * - Production installations cannot use prerelease versions
 * - Must have authorized delivery permissions (unless skipUserValidation)
 *
 * Drools equivalent would check:
 * - IF action is PackageInstallationAction
 * - THEN validate environment exists
 * - AND validate instance name is extractable
 * - AND IF not maskSemverFailures THEN validate semver
 * - AND IF production AND prerelease THEN fail
 * - AND IF not skipUserValidation THEN validate assisted delivery
 */
@Injectable()
export class PackageInstallationValidationRule extends BaseValidationRule {
  constructor(
    private readonly actionUtil: ActionUtil,
    private readonly persistenceUtil: PersistenceUtilService,
    private readonly assistedDeliveryValidationRule: AssistedDeliveryValidationRule,
  ) {
    super();
  }

  getRuleName(): string {
    return 'package-installation-validation';
  }

  getPriority(): number {
    return 70; // Execute after build validation
  }

  async evaluate(context: IDecisionContext): Promise<IDecisionResult> {
    if (!(context.action instanceof PackageInstallationActionEmbeddable)) {
      return this.pass();
    }

    const env = (await this.persistenceUtil.getEnvMap())[
      context.action.service.environment
    ];
    if (!env) {
      return this.fail(
        'Package installation must specify a valid environment.',
        'service.environment',
      );
    }

    const instanceName = this.actionUtil.instanceName(context.action);
    if (!instanceName) {
      return this.fail(
        'Service instance name could not be extracted from action.',
        INTENTION_SERVICE_INSTANCE_SEARCH_PATHS.join(),
      );
    }

    const parsedVersion = this.parseActionVersion(context);
    const validateSemverError = this.validateSemver(context);
    const maskSemverFailures = !!context.account?.maskSemverFailures;

    if (!validateSemverError.valid && !maskSemverFailures) {
      return validateSemverError;
    }

    if (
      !maskSemverFailures &&
      env.name === ENVIRONMENT_NAMES.PRODUCTION &&
      parsedVersion.prerelease
    ) {
      return this.fail(
        'Only release versions may be installed in production. See: https://semver.org/#spec-item-9',
        'package.version',
      );
    }

    if (context.account && context.account.skipUserValidation) {
      return this.pass();
    }

    return this.assistedDeliveryValidationRule.evaluate(context);
  }

  private validateSemver(context: IDecisionContext): IDecisionResult {
    const parsedVersion = this.parseActionVersion(context);
    if (!this.actionUtil.isStrictSemver(parsedVersion)) {
      return this.fail(
        context.action.package?.version
          ? 'Package actions must specify a valid semver version. See: https://semver.org'
          : 'No package version set. If using source intention, check action.source values.',
        'package.version',
      );
    }
    return this.pass();
  }

  private parseActionVersion(context: IDecisionContext) {
    return this.actionUtil.parseVersion(context.action.package?.version ?? '');
  }
}
