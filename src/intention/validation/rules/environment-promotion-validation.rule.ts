import { Injectable } from '@nestjs/common';
import { BaseValidationRule } from '../validation-rule.interface';
import { DecisionContext, DecisionResult } from '../decision-context.interface';
import { PackageInstallationActionEmbeddable } from '../../entity/package-installation-action.embeddable';
import { GraphRepository } from '../../../persistence/interfaces/graph.repository';
import { CollectionRepository } from '../../../persistence/interfaces/collection.repository';
import { IntentionRepository } from '../../../persistence/interfaces/intention.repository';
import { CollectionNameEnum } from '../../../persistence/dto/collection-dto-union.type';
import { EnvironmentDto } from '../../../persistence/dto/environment.dto';
import { PersistenceUtilService } from '../../../persistence/persistence-util.service';

/**
 * Validation Rule: Environment Promotion Validation
 *
 * DMN Decision: Verify deployments follow environment promotion path
 *
 * Business Rule:
 * - If target environment has a "promote-to" edge pointing to it from another environment
 * - Then the same package build must exist in the source (prerequisite) environment
 * - If no "promote-to" edge exists, validation passes
 *
 * Example: If "test" has promote-to -> "production"
 * - Cannot deploy build X to production unless build X is already deployed to test
 *
 * Drools equivalent would check:
 * - IF action is PackageInstallationAction
 * - AND upstream environment exists with "promote-to" edge
 * - THEN validate build exists in upstream environment
 * - ELSE pass
 */
@Injectable()
export class EnvironmentPromotionValidationRule extends BaseValidationRule {
  constructor(
    private readonly graphRepository: GraphRepository,
    private readonly collectionRepository: CollectionRepository,
    private readonly intentionRepository: IntentionRepository,
    private readonly persistenceUtil: PersistenceUtilService,
  ) {
    super();
  }

  getRuleName(): string {
    return 'environment-promotion-validation';
  }

  getPriority(): number {
    return 65; // Execute after basic validations but before installation validation
  }

  async evaluate(context: DecisionContext): Promise<DecisionResult> {
    if (!(context.action instanceof PackageInstallationActionEmbeddable)) {
      return this.pass();
    }

    // Get the git hash (buildVersion) being deployed
    const deployingBuildVersion = context.action.package?.buildVersion;
    if (!deployingBuildVersion) {
      return this.pass(); // No buildVersion, let other rules handle
    }

    // Get target environment by name
    const envMap = await this.persistenceUtil.getEnvMap();
    const targetEnv = envMap[context.action.service.environment];

    if (!targetEnv) {
      return this.pass(); // No environment found, let other rules handle
    }

    // Check if there are any "promote-to" edges targeting this environment
    const promoteToEdges = await this.graphRepository.getUpstreamVertex<EnvironmentDto>(
      targetEnv.vertex.toString(),
      CollectionNameEnum.environment,
      ['promotes-to'],
      true,
    );

    // If no promote-to edges exist, validation passes
    if (promoteToEdges.length === 0) {
      return this.pass();
    }

    // Get the service ID
    const serviceId = context.action.service.id?.toString();
    if (!serviceId) {
      return this.fail(
        'Service ID is required for environment promotion validation.',
        'service.id',
      );
    }

    // Get service details with all service instances and their environments
    const serviceDetails = await this.graphRepository.getServiceDetails(serviceId);

    if (!serviceDetails) {
      return this.fail(
        `Service with ID ${serviceId} does not exist so must be deployed to a lower environment first.`,
        'service.id',
      );
    }

    // Check each prerequisite environment
    for (const promoteFrom of promoteToEdges) {
      const sourceEnvName = promoteFrom.collection.name;
      let foundMatchingHashInSourceEnv = false;

      // Check each service instance to find one in the source environment
      for (const instance of serviceDetails.serviceInstance) {
        // Check if this instance is deployed to the source environment
        if (instance.environment?.name !== sourceEnvName) {
          continue;
        }

        // This instance is in the source environment
        // The action field contains the most recent successful package-installation
        if (!instance.action) {
          continue;
        }

        const intention = instance.action.source.intention;
        const installAction = instance.action.source.action;

        if (!intention) continue;
        if (!installAction) continue;

        // Check if the buildVersion (git hash) matches
        const deployedBuildVersion = installAction.package?.buildVersion;
        if (deployedBuildVersion === deployingBuildVersion) {
          foundMatchingHashInSourceEnv = true;
          break;
        }
      }

      if (!foundMatchingHashInSourceEnv) {
        return this.fail(
          `Build with git hash ${deployingBuildVersion.substring(0, 8)} must be deployed to ${sourceEnvName} environment before deploying to ${context.action.service.environment}. Deploy to ${sourceEnvName} first, then retry this installation.`,
          'service.environment',
        );
      }
    }

    return this.pass();
  }
}
