import { Injectable } from '@nestjs/common';
import { BaseValidationRule } from '../validation-rule.interface';
import { DecisionContext, DecisionResult } from '../decision-context.interface';
import { DeploymentConfigBuildActionEmbeddable } from '../../entity/deployment-config-build-action.embeddable';
import { PersistenceUtilService } from '../../../persistence/persistence-util.service';
import { ActionUtil } from '../../../util/action.util';

/**
 * Validation Rule: Deployment Config Build Action Validation
 *
 * DMN Decision: Verify deployment config build actions meet business requirements
 *
 * Business Rule: Deployment config build actions must specify a valid environment
 * and the environment must be 'tools'.
 *
 * Drools equivalent would check:
 * - IF action is DeploymentConfigBuildAction
 * - THEN validate environment exists
 * - AND validate environment is 'tools'
 */
@Injectable()
export class DeploymentConfigBuildValidationRule extends BaseValidationRule {
  constructor(
    private readonly actionUtil: ActionUtil,
    private readonly persistenceUtil: PersistenceUtilService,
  ) {
    super();
  }

  getRuleName(): string {
    return 'deployment-config-build-validation';
  }

  getPriority(): number {
    return 55; // Execute after database access validation but before environment promotion
  }

  async evaluate(context: DecisionContext): Promise<DecisionResult> {
    if (!(context.action instanceof DeploymentConfigBuildActionEmbeddable)) {
      return this.pass();
    }

    // Validate environment exists
    const envMap = await this.persistenceUtil.getEnvMap();
    const env = envMap[context.action.service.environment];
    if (!env) {
      return this.fail(
        'Deployment config build must specify a valid environment.',
        'service.environment',
      );
    }

    // Validate environment is tools
    if (env.name !== 'tools') {
      return this.fail(
        'Deployment config builds can only be performed in the tools environment.',
        'service.environment',
      );
    }

    const parsedVersion = this.parseActionVersion(context);
    if (!this.actionUtil.isStrictSemver(parsedVersion)) {
      return this.fail('Deployment config build must specify a valid semver version.', 'package.version' + JSON.stringify(context.action));
    }

    // const existingBuild = await this.buildRepository.getServiceBuildByVersion(...);
    // if (existingBuild && this.checkValueChanged(...)) {
    //   return this.fail('Release deployment config build version may not be altered.', 'package.version');
    // }

    return this.pass();
  }

  private parseActionVersion(context: DecisionContext) {
    return this.actionUtil.parseVersion(context.action.package?.version ?? '');
  }
}
