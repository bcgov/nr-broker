import { Injectable } from '@nestjs/common';
import { ActionError } from './action.error';
import { ActionUtil } from './action.util';
import { ActionDto } from './dto/action.dto';
import { DatabaseAccessActionDto } from './dto/database-access-action.dto';
import { IntentionDto } from './dto/intention.dto';

const DATABASE_ACCESS_DEVELOPER_ENV = ['development'];

/**
 * Assists with the validation of intention actions
 */
@Injectable()
export class ActionService {
  // Temporarily read from env
  private readonly USER_ADMIN = process.env.USER_ADMIN
    ? process.env.USER_ADMIN.split(',')
    : '';
  private readonly USER_DBA = process.env.USER_DBA
    ? process.env.USER_DBA.split(',')
    : '';
  private readonly USER_DEVELOPER = process.env.USER_DEVELOPER
    ? process.env.USER_DEVELOPER.split(',')
    : '';

  constructor(private actionUtil: ActionUtil) {}

  public validate(
    intention: IntentionDto,
    action: ActionDto,
  ): ActionError | null {
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
          key: 'action.service.environment',
          value: action.service.environment,
        },
      };
    }
    // Temporary
    if (
      intention.jwt.projects &&
      intention.jwt.projects.indexOf(action.service.project) === -1
    ) {
      return {
        message: 'Token not authorized for this project',
        data: {
          action: action.action,
          action_id: action.id,
          key: 'action.service.project',
          value: action.service.project,
        },
      };
    }
    if (action instanceof DatabaseAccessActionDto) {
      // Temporary
      if (intention.user.id === 'unknown') {
        return {
          message: 'Database access requires a user to evaluate authorization',
          data: {
            action: action.action,
            action_id: action.id,
            key: 'user.id',
            value: intention.user.id,
          },
        };
      } else if (
        !!intention.jwt.delegatedUserAuth ||
        this.USER_ADMIN.indexOf(intention.user.id) !== -1 ||
        this.USER_DBA.indexOf(intention.user.id) !== -1
      ) {
        return null;
      } else if (this.USER_DEVELOPER.indexOf(intention.user.id) !== -1) {
        if (
          DATABASE_ACCESS_DEVELOPER_ENV.indexOf(action.service.environment) !==
          -1
        ) {
          return null;
        } else {
          return {
            message: 'User is not authorized to access this environment',
            data: {
              action: action.action,
              action_id: action.id,
              key: 'user.id',
              value: intention.user.id,
            },
          };
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
    return null;
  }
}
