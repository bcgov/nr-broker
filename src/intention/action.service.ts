import { Injectable } from '@nestjs/common';
import { ActionUtil } from '../util/action.util';
import { IntentionEntity } from './entity/intention.entity';
import { BrokerAccountProjectMapDto } from '../persistence/dto/graph-data.dto';
import { BrokerAccountEntity } from '../persistence/entity/broker-account.entity';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { BuildRepository } from '../persistence/interfaces/build.repository';
import { INTENTION_SERVICE_INSTANCE_SEARCH_PATHS } from '../constants';
import { UserCollectionService } from '../collection/user-collection.service';
import { PersistenceUtilService } from '../persistence/persistence-util.service';
import { ActionEmbeddable } from './entity/action.embeddable';
import { PackageInstallationActionEmbeddable } from './entity/package-installation-action.embeddable';
import { DatabaseAccessActionEmbeddable } from './entity/database-access-action.embeddable';
import { PackageBuildActionEmbeddable } from './entity/package-build-action.embeddable';
import { PackageEmbeddable } from './entity/package.embeddable';
import { UserEntity } from '../persistence/entity/user.entity';
import { ENVIRONMENT_NAMES } from './dto/constants.dto';
import { ActionRuleViolationEmbeddable } from './entity/action-rule-violation.embeddable';

/**
 * Assists with the validation of intention actions
 */
@Injectable()
export class ActionService {
  constructor(
    private readonly actionUtil: ActionUtil,
    private readonly buildRepository: BuildRepository,
    private readonly collectionRepository: CollectionRepository,
    private readonly userCollectionService: UserCollectionService,
    private readonly graphRepository: GraphRepository,
    private readonly persistenceUtil: PersistenceUtilService,
  ) {}

  public async validate(
    intention: IntentionEntity,
    action: ActionEmbeddable,
    account: BrokerAccountEntity | null,
    accountBoundProjects: BrokerAccountProjectMapDto | null,
    targetServices: string[],
    requireProjectExists: boolean,
    requireServiceExists: boolean,
  ): Promise<void> | null {
    const user = await this.userCollectionService.lookupUserByGuid(
      action.user.id,
    );

    const ruleViolation =
      this.validateUserSet(account, user) ??
      this.validateVaultEnv(action) ??
      this.validateAccountBoundProject(
        action,
        accountBoundProjects,
        requireProjectExists,
        requireServiceExists,
      ) ??
      this.validateTargetService(action, targetServices) ??
      (await this.validateDatabaseAccessAction(user, intention, action)) ??
      (await this.validatePackageBuildAction(account, intention, action)) ??
      (await this.validatePackageInstallAction(
        account,
        user,
        intention,
        action,
      )) ??
      null;

    if (ruleViolation) {
      action.ruleViolation = ruleViolation;
      action.trace.outcome = 'rejected';
    }
  }

  private validateUserSet(
    account: BrokerAccountEntity | null,
    user: UserEntity,
  ): ActionRuleViolationEmbeddable | null {
    if (account && account.skipUserValidation) {
      return null;
    }
    if (!user) {
      return new ActionRuleViolationEmbeddable(
        'Unknown user. All actions required to be mapped to user. Does user exist with provided id or name and domain?',
        'user.id',
      );
    }
    return null;
  }

  private validateVaultEnv(
    action: ActionEmbeddable,
  ): ActionRuleViolationEmbeddable | null {
    if (
      this.actionUtil.isProvisioned(action) &&
      !this.actionUtil.isValidVaultEnvironment(action)
    ) {
      return new ActionRuleViolationEmbeddable(
        'Explicitly set action.vaultEnvironment when service environment is not valid for Vault. Vault environment must be production, test or development.',
        action.service.target?.environment
          ? 'service.target.environment'
          : 'service.environment',
      );
    }
  }

  private validateAccountBoundProject(
    action: ActionEmbeddable,
    accountBoundProjects: BrokerAccountProjectMapDto | null,
    requireProjectExists: boolean,
    requireServiceExists: boolean,
  ): ActionRuleViolationEmbeddable | null {
    if (accountBoundProjects) {
      const service = action.service;
      const projectFound = !!accountBoundProjects[service.project];
      const serviceFound =
        projectFound &&
        accountBoundProjects[service.project].services.indexOf(service.name) !==
          -1;

      if (!projectFound && requireProjectExists) {
        return new ActionRuleViolationEmbeddable(
          'Token not authorized for this project',
          'service.project',
        );
      }
      if (!serviceFound && requireServiceExists) {
        return new ActionRuleViolationEmbeddable(
          'Token not authorized for this service',
          'service.name',
        );
      }
    }
  }

  private validateTargetService(
    action: ActionEmbeddable,
    targetServices: string[],
  ): ActionRuleViolationEmbeddable | null {
    if (!action.service.target) {
      return null;
    }
    const targetServiceFound =
      targetServices.indexOf(action.service.target.name) !== -1;
    if (targetServiceFound) {
      return null;
    } else {
      return new ActionRuleViolationEmbeddable(
        'Service not configured for target',
        'service.target.name',
      );
    }
  }

  private async validateDatabaseAccessAction(
    user: UserEntity,
    intention: IntentionEntity,
    action: ActionEmbeddable,
  ): Promise<ActionRuleViolationEmbeddable | null> {
    if (action instanceof DatabaseAccessActionEmbeddable) {
      // Ensure user validation done. May have been skipped if option set.
      const userValidation = this.validateUserSet(null, user);
      if (userValidation) {
        return userValidation;
      }

      return this.validateAssistedDelivery(user, intention, action);
    }
    return null;
  }

  private async validatePackageBuildAction(
    account: BrokerAccountEntity | null,
    intention: IntentionEntity,
    action: ActionEmbeddable,
  ): Promise<ActionRuleViolationEmbeddable | null> {
    if (action instanceof PackageBuildActionEmbeddable) {
      // TODO: check for existing build
      const validateSemverError = this.validateSemver(action);
      if (validateSemverError) {
        return validateSemverError;
      }

      if (!action.package?.name) {
        return new ActionRuleViolationEmbeddable(
          'Package actions must specify a name.',
          'package.name',
        );
      }

      if (!action.package?.buildVersion) {
        return new ActionRuleViolationEmbeddable(
          'Package actions must specify scm hash.',
          'package.buildVersion',
        );
      }

      const parsedVersion = this.parseActionVersion(action);
      if (parsedVersion.prerelease) {
        return null;
      }

      const service = action.service.id
        ? await this.collectionRepository.getCollectionById(
            'service',
            action.service.id.toString(),
          )
        : null;

      if (!service) {
        if (account?.requireServiceExists) {
          return new ActionRuleViolationEmbeddable(
            'Package service not found.',
            'package.name',
          );
        } else {
          return null;
        }
      }

      const existingBuild = await this.buildRepository.getServiceBuildByVersion(
        service.id.toString(),
        action.package.name,
        parsedVersion,
      );

      if (
        existingBuild &&
        this.checkValueChanged(
          action.package,
          existingBuild.package,
          'buildVersion',
        )
      ) {
        return new ActionRuleViolationEmbeddable(
          'Release package build version (git commit hash) may not be altered.',
          'package.version',
        );
      }
    }
    return null;
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

  private async validatePackageInstallAction(
    account: BrokerAccountEntity | null,
    user: UserEntity,
    intention: IntentionEntity,
    action: ActionEmbeddable,
  ): Promise<ActionRuleViolationEmbeddable | null> {
    if (action instanceof PackageInstallationActionEmbeddable) {
      const env = (await this.persistenceUtil.getEnvMap())[
        action.service.environment
      ];
      if (!env) {
        return new ActionRuleViolationEmbeddable(
          'Package installation must specify a valid environment.',
          'service.environment',
        );
      }

      const instanceName = this.actionUtil.instanceName(action);
      if (!instanceName) {
        return new ActionRuleViolationEmbeddable(
          'Service instance name could not be extracted from action.',
          INTENTION_SERVICE_INSTANCE_SEARCH_PATHS.join(),
        );
      }
      const parsedVersion = this.parseActionVersion(action);
      const validateSemverError = this.validateSemver(action);
      const maskSemverFailures = !!account?.maskSemverFailures;
      if (validateSemverError && !maskSemverFailures) {
        return validateSemverError;
      }

      if (
        !maskSemverFailures &&
        env.name === ENVIRONMENT_NAMES.PRODUCTION &&
        parsedVersion.prerelease
      ) {
        return new ActionRuleViolationEmbeddable(
          'Only release versions may be installed in production. See: https://semver.org/#spec-item-9',
          'package.version',
        );
      }

      if (account && account.skipUserValidation) {
        return null;
      }

      return this.validateAssistedDelivery(user, intention, action);
    }
    return null;
  }

  private parseActionVersion(action: ActionEmbeddable) {
    return this.actionUtil.parseVersion(action.package?.version ?? '');
  }

  private validateSemver(
    action: ActionEmbeddable,
  ): ActionRuleViolationEmbeddable | null {
    const parsedVersion = this.parseActionVersion(action);
    if (!this.actionUtil.isStrictSemver(parsedVersion)) {
      return new ActionRuleViolationEmbeddable(
        action.package?.version
          ? 'Package actions must specify a valid semver version. See: https://semver.org'
          : 'No package version set. If using source intention, check action.source values.',
        'package.version',
      );
    }
    return null;
  }

  private async validateAssistedDelivery(
    user: UserEntity,
    intention: IntentionEntity,
    action: ActionEmbeddable,
  ): Promise<ActionRuleViolationEmbeddable | null> {
    const project = await this.collectionRepository.getCollectionByKeyValue(
      'project',
      'name',
      action.service.project,
    );
    const service = await this.collectionRepository.getCollectionByKeyValue(
      'service',
      'name',
      action.service.name,
    );
    const environment = await this.collectionRepository.getCollectionByKeyValue(
      'environment',
      'name',
      action.service.environment,
    );

    // Check if project and service exist -- not possible as they are required to open
    if (!project || !service) {
      return null;
    }
    const vertex = await this.graphRepository.getEdgeByNameAndVertices(
      'component',
      project.vertex.toString(),
      service.vertex.toString(),
    );

    if (!vertex) {
      return new ActionRuleViolationEmbeddable(
        'Cannot find component edge',
        'service.name',
      );
    }

    if (
      await this.persistenceUtil.testAccess(
        vertex.getPropAsArray(
          `changeroles-${action.service.environment}`,
          environment.changeRoles,
        ),
        user.vertex.toString(),
        service.vertex.toString(),
        true,
      )
    ) {
      return null;
    } else {
      return new ActionRuleViolationEmbeddable(
        'User is not authorized to access this environment',
        'user.id',
      );
    }
  }
}
