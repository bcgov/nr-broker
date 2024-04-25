import { Injectable } from '@nestjs/common';
import { ActionError } from './action.error';
import { ActionUtil } from '../util/action.util';
import { ActionDto } from './dto/action.dto';
import { DatabaseAccessActionDto } from './dto/database-access-action.dto';
import { IntentionDto } from './dto/intention.dto';
import { BrokerAccountProjectMapDto } from '../persistence/dto/graph-data.dto';
import { BrokerAccountDto } from '../persistence/dto/broker-account.dto';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import {
  ACTION_VALIDATE_TEAM_ADMIN,
  ACTION_VALIDATE_TEAM_DBA,
  INTENTION_SERVICE_INSTANCE_SEARCH_PATHS,
} from '../constants';
import { UserDto } from '../persistence/dto/user.dto';
import { UserCollectionService } from '../collection/user-collection.service';
import { PersistenceUtilService } from '../persistence/persistence-util.service';
import { PackageInstallationActionDto } from './dto/package-installation-action.dto';
import { PackageBuildActionDto } from './dto/package-build-action.dto';

/**
 * Assists with the validation of intention actions
 */
@Injectable()
export class ActionService {
  constructor(
    private readonly actionUtil: ActionUtil,
    private readonly collectionRepository: CollectionRepository,
    private readonly userCollectionService: UserCollectionService,
    private readonly graphRepository: GraphRepository,
    private readonly persistenceUtil: PersistenceUtilService,
  ) {}

  public async bindUserToAction(
    account: BrokerAccountDto | null,
    action: ActionDto,
  ) {
    let user: UserDto;
    if (!action.user) {
      return;
    }

    if (action.user.id) {
      user = await this.userCollectionService.lookupUserByGuid(action.user.id);
    } else if (action.user.name) {
      user = await this.userCollectionService.lookupUserByName(
        action.user.name,
        action.user.domain,
      );
    }

    if (user) {
      action.user.domain = user.domain;
      action.user.email = user.email;
      action.user.full_name = user.name;
      action.user.id = user.guid;
      action.user.name = user.username;
    }

    if (account) {
      action.user.group = {
        ...(action.user.group ?? {}),
        id: account.id.toString(),
        name: account.name,
        domain: 'broker',
      };
    }
  }

  public async validate(
    intention: IntentionDto,
    action: ActionDto,
    account: BrokerAccountDto | null,
    accountBoundProjects: BrokerAccountProjectMapDto | null,
    targetServices: string[],
    requireProjectExists: boolean,
    requireServiceExists: boolean,
  ): Promise<ActionError> | null {
    const user = await this.userCollectionService.lookupUserByGuid(
      action.user?.id,
    );

    return (
      this.validateUserSet(account, user, action) ??
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
      null
    );
  }

  private validateUserSet(
    account: BrokerAccountDto | null,
    user: any,
    action: ActionDto,
  ): ActionError | null {
    if (account && account.skipUserValidation) {
      return null;
    }
    if (!user) {
      return {
        message:
          'Unknown user. All actions required to be mapped to user. Does user exist with provided id or name and domain?',
        data: {
          action: action.action,
          action_id: action.id,
          key: 'action.user.id',
          value: action.user.id,
        },
      };
    }
    return null;
  }

  private validateVaultEnv(action: ActionDto): ActionError | null {
    if (
      this.actionUtil.isProvisioned(action) &&
      !this.actionUtil.isValidVaultEnvironment(action)
    ) {
      return {
        message:
          'Explicitly set action.vaultEnvironment when service environment is not valid for Vault. Vault environment must be production, test or development.',
        data: {
          action: action.action,
          action_id: action.id,
          key: action.service.target.environment
            ? 'action.service.target.environment'
            : 'action.service.environment',
          value: action.service.target.environment
            ? action.service.target.environment
            : action.service.environment,
        },
      };
    }
  }

  private validateAccountBoundProject(
    action: ActionDto,
    accountBoundProjects: BrokerAccountProjectMapDto | null,
    requireProjectExists: boolean,
    requireServiceExists: boolean,
  ): ActionError | null {
    if (accountBoundProjects) {
      const service = action.service;
      const projectFound = !!accountBoundProjects[service.project];
      const serviceFound =
        projectFound &&
        accountBoundProjects[service.project].services.indexOf(service.name) !==
          -1;

      if (!projectFound && requireProjectExists) {
        return {
          message: 'Token not authorized for this project',
          data: {
            action: action.action,
            action_id: action.id,
            key: 'action.service.project',
            value: service.project,
          },
        };
      }
      if (!serviceFound && requireServiceExists) {
        return {
          message: 'Token not authorized for this service',
          data: {
            action: action.action,
            action_id: action.id,
            key: 'action.service.name',
            value: service.name,
          },
        };
      }
    }
  }

  private validateTargetService(
    action: ActionDto,
    targetServices: string[],
  ): ActionError | null {
    if (!action.service.target) {
      return null;
    }
    const targetServiceFound =
      targetServices.indexOf(action.service.target.name) !== -1;
    if (targetServiceFound) {
      return null;
    } else {
      return {
        message: 'Service not configured for target',
        data: {
          action: action.action,
          action_id: action.id,
          key: 'action.service.target.name',
          value: action.service.target.name,
        },
      };
    }
  }

  private async validateDatabaseAccessAction(
    user: any,
    intention: IntentionDto,
    action: ActionDto,
  ): Promise<ActionError | null> {
    if (action instanceof DatabaseAccessActionDto) {
      // Ensure user validation done. May have been skipped if option set.
      const userValidation = this.validateUserSet(null, user, action);
      if (userValidation) {
        return userValidation;
      }
      if (
        (await this.persistenceUtil.testAccess(
          ['developer', 'lead-developer'],
          user.vertex.toString(),
          ACTION_VALIDATE_TEAM_ADMIN,
          false,
        )) ||
        (await this.persistenceUtil.testAccess(
          ['developer', 'lead-developer'],
          user.vertex.toString(),
          ACTION_VALIDATE_TEAM_DBA,
          false,
        ))
      ) {
        return null;
      }
      return this.validateAssistedDelivery(user, intention, action);
    }
    return null;
  }

  private async validatePackageBuildAction(
    account: BrokerAccountDto | null,
    intention: IntentionDto,
    action: ActionDto,
  ): Promise<ActionError | null> {
    if (action instanceof PackageBuildActionDto) {
      // TODO: check for existing build
      const validateSemverError = this.validateSemver(action);
      if (validateSemverError) {
        return validateSemverError;
      }

      if (!action.package?.name) {
        return {
          message: 'Package actions must specify a name.',
          data: {
            action: action.action,
            action_id: action.id,
            key: 'action.package.name',
            value: action.package?.name,
          },
        };
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
        return {
          message: 'Package service not found.',
          data: {
            action: action.action,
            action_id: action.id,
            key: 'action.package.name',
            value: action.package?.name,
          },
        };
      }

      const existingBuild =
        await this.collectionRepository.getBuildByPackageDetail(
          service.id.toString(),
          action.package.name,
          parsedVersion,
        );

      if (
        existingBuild &&
        (action.package?.buildVersion !== existingBuild.package?.buildVersion ||
          (action.package?.checksum &&
            action.package?.checksum !== existingBuild.package?.checksum))
      ) {
        console.log(action.package);
        console.log(existingBuild.package);
        return {
          message: 'Release version may not be altered.',
          data: {
            action: action.action,
            action_id: action.id,
            key: 'action.package.version',
            value: action.package?.version,
          },
        };
      }
    }
    return null;
  }

  private async validatePackageInstallAction(
    account: BrokerAccountDto | null,
    user: any,
    intention: IntentionDto,
    action: ActionDto,
  ): Promise<ActionError | null> {
    if (action instanceof PackageInstallationActionDto) {
      const env = (await this.persistenceUtil.getEnvMap())[
        action.service.environment
      ];
      if (!env) {
        return {
          message: 'Package installation must specify a valid environment.',
          data: {
            action: action.action,
            action_id: action.id,
            key: 'action.service.environment',
            value: action.service.environment,
          },
        };
      }

      const instanceName = this.actionUtil.instanceName(action);
      if (!instanceName) {
        return {
          message: 'Service instance name could not be extracted from action.',
          data: {
            action: action.action,
            action_id: action.id,
            key: INTENTION_SERVICE_INSTANCE_SEARCH_PATHS.join(),
            value: 'undefined',
          },
        };
      }
      const parsedVersion = this.parseActionVersion(action);
      const validateSemverError = this.validateSemver(action);
      if (validateSemverError) {
        return validateSemverError;
      }

      if (env.name === 'production' && parsedVersion.prerelease) {
        return {
          message:
            'Only release versions may be installed in production. See: https://semver.org/#spec-item-9',
          data: {
            action: action.action,
            action_id: action.id,
            key: 'action.package.version',
            value: action.package.version,
          },
        };
      }

      // Test if user is admin and skip delivery validation if they are
      if (
        (account && account.skipUserValidation) ||
        (await this.persistenceUtil.testAccess(
          ['developer', 'lead-developer'],
          user.vertex.toString(),
          ACTION_VALIDATE_TEAM_ADMIN,
          false,
        ))
      ) {
        return null;
      }

      return this.validateAssistedDelivery(user, intention, action);
    }
    return null;
  }

  private parseActionVersion(action: ActionDto) {
    return this.actionUtil.parseVersion(action.package?.version ?? '');
  }

  private validateSemver(action: ActionDto): ActionError | null {
    const parsedVersion = this.parseActionVersion(action);
    if (!this.actionUtil.isStrictSemver(parsedVersion)) {
      return {
        message:
          'Package actions must specify a valid semver version. See: https://semver.org',
        data: {
          action: action.action,
          action_id: action.id,
          key: 'action.package.version',
          value: action.package?.version,
        },
      };
    }
    return null;
  }

  private async validateAssistedDelivery(
    user: any,
    intention: IntentionDto,
    action: ActionDto,
  ): Promise<ActionError | null> {
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

    if (!project || !service) {
      return null;
    }

    if (
      await this.persistenceUtil.testAccess(
        ['developer', 'lead-developer'],
        user.vertex.toString(),
        service.vertex.toString(),
        true,
      )
    ) {
      const vertex = await this.graphRepository.getEdgeByNameAndVertices(
        'component',
        project.vertex.toString(),
        service.vertex.toString(),
      );

      if (
        vertex &&
        vertex.prop &&
        vertex.prop[`ad-${action.service.environment}`] === 'true'
      ) {
        return {
          message: 'User is not authorized to access this environment',
          data: {
            action: action.action,
            action_id: action.id,
            key: 'user.id',
            value: intention.user.id,
          },
        };
      } else {
        return null;
      }
    } else {
      return {
        message: 'User is not authorized to do this action',
        data: {
          action: action.action,
          action_id: action.id,
          key: 'user.id',
          value: intention.user.id,
        },
      };
    }
  }
}
