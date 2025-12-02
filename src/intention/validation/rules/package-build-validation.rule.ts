import { Injectable } from '@nestjs/common';
import { BaseValidationRule } from '../validation-rule.interface';
import { IDecisionContext, IDecisionResult } from '../decision-context.interface';
import { PackageBuildActionEmbeddable } from '../../entity/package-build-action.embeddable';
import { BuildRepository } from '../../../persistence/interfaces/build.repository';
import { CollectionRepository } from '../../../persistence/interfaces/collection.repository';
import { ActionUtil } from '../../../util/action.util';
import { PackageEmbeddable } from '../../entity/package.embeddable';

/**
 * Validation Rule: Package Build Action Validation
 *
 * DMN Decision: Verify package build actions meet business requirements
 *
 * Business Rule:
 * - Package must have a name and buildVersion (git hash)
 * - Version must be valid semver
 * - For release versions (non-prerelease), if build already exists,
 *   buildVersion (git hash) cannot be changed
 *
 * Drools equivalent would check:
 * - IF action is PackageBuildAction
 * - THEN validate package.name exists
 * - AND validate package.buildVersion exists
 * - AND validate semver format
 * - AND IF not prerelease AND build exists
 * - THEN validate buildVersion unchanged
 */
@Injectable()
export class PackageBuildValidationRule extends BaseValidationRule {
  constructor(
    private readonly actionUtil: ActionUtil,
    private readonly buildRepository: BuildRepository,
    private readonly collectionRepository: CollectionRepository,
  ) {
    super();
  }

  getRuleName(): string {
    return 'package-build-validation';
  }

  getPriority(): number {
    return 60; // Execute after basic validations, may require DB queries
  }

  async evaluate(context: IDecisionContext): Promise<IDecisionResult> {
    if (!(context.action instanceof PackageBuildActionEmbeddable)) {
      return this.pass();
    }

    // Validate semver
    const validateSemverError = this.validateSemver(context);
    if (!validateSemverError.valid) {
      return validateSemverError;
    }

    if (!context.action.package?.name) {
      return this.fail('Package actions must specify a name.', 'package.name');
    }

    if (!context.action.package?.buildVersion) {
      return this.fail(
        'Package actions must specify scm hash.',
        'package.buildVersion',
      );
    }

    const parsedVersion = this.parseActionVersion(context);
    if (parsedVersion.prerelease) {
      return this.pass();
    }

    const service = context.action.service.id
      ? await this.collectionRepository.getCollectionById(
          'service',
          context.action.service.id.toString(),
        )
      : null;

    if (!service) {
      if (context.account?.requireServiceExists) {
        return this.fail('Package service not found.', 'package.name');
      } else {
        return this.pass();
      }
    }

    const existingBuild =
      await this.buildRepository.getServiceBuildByVersion(
        service.id.toString(),
        context.action.package.name,
        parsedVersion,
      );

    if (
      existingBuild &&
      this.checkValueChanged(
        context.action.package,
        existingBuild.package,
        'buildVersion',
      )
    ) {
      return this.fail(
        'Release package build version (git commit hash) may not be altered.',
        'package.version',
      );
    }

    return this.pass();
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

  private checkValueChanged(
    newPackage: PackageEmbeddable | undefined,
    curPackage: PackageEmbeddable | undefined,
    value: string,
  ) {
    if (
      !curPackage ||
      !newPackage ||
      curPackage[value] === undefined ||
      newPackage[value] === undefined
    ) {
      return false;
    }

    return curPackage[value] !== newPackage[value];
  }
}
