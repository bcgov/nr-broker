import { Injectable } from '@nestjs/common';
import { DatabaseAccessActionDto } from './dto/database-access-action.dto';
import { IntentionDto } from './dto/intention.dto';

const DATABASE_ACCESS_DEVELOPER_ENV = ['test', 'development'];

export interface ActionError {
  message: string;
  data: {
    action: string;
    action_id: string;
    key: string;
    value: string;
  };
}
@Injectable()
export class ActionService {
  private readonly USER_ADMIN = process.env.USER_ADMIN
    ? process.env.USER_ADMIN.split(',')
    : '';
  private readonly USER_DBA = process.env.USER_DBA
    ? process.env.USER_DBA.split(',')
    : '';
  private readonly USER_DEVELOPER = process.env.USER_DEVELOPER
    ? process.env.USER_DEVELOPER.split(',')
    : '';

  public validate(intention: IntentionDto, action: any): ActionError | null {
    if (action instanceof DatabaseAccessActionDto) {
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
