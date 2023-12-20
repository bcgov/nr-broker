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
} from '../constants';
import { UserDto } from '../persistence/dto/user.dto';
import { UserCollectionService } from '../collection/user-collection.service';
import { PersistenceUtilService } from '../persistence/persistence-util.service';
import { PackageInstallationActionDto } from './dto/package-installation-action.dto';

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
      (await this.validateDbAction(user, intention, action)) ??
      (await this.validatePackageAction(account, user, intention, action)) ??
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

  private async validateDbAction(
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

  private async validatePackageAction(
    account: BrokerAccountDto | null,
    user: any,
    intention: IntentionDto,
    action: ActionDto,
  ): Promise<ActionError | null> {
    if (action instanceof PackageInstallationActionDto) {
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

      const env = (await this.persistenceUtil.getEnvMap())[
        action.service.environment
      ];

      if (
        env &&
        action.package &&
        action.package.version &&
        action.package.version.toLowerCase().endsWith('-snapshot') &&
        env.name === 'production'
      ) {
        return {
          message:
            'Only release versions (no snapshot builds) may be installed in production.',
          data: {
            action: action.action,
            action_id: action.id,
            key: 'action.package.version',
            value: action.package.version,
          },
        };
      }

      return this.validateAssistedDelivery(user, intention, action);
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
