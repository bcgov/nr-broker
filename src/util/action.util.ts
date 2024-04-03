import { BadRequestException, Injectable } from '@nestjs/common';
import { get } from 'radash';
import {
  INTENTION_INSTANCE_PATHS,
  VAULT_ENVIRONMENTS,
  VAULT_PROVISIONED_ACTION_SET,
} from '../constants';
import { ActionDto, isActionName } from '../intention/dto/action.dto';

export type FindArtifactActionOptions = Partial<
  Pick<ActionDto, 'action' | 'id'>
>;

@Injectable()
export class ActionUtil {
  public resolveVaultEnvironment(action: ActionDto): string | undefined {
    return (
      action.vaultEnvironment ??
      (action.service.target && action.service.target.environment) ??
      action.service.environment
    );
  }

  public isValidVaultEnvironment(action: ActionDto): boolean {
    return (
      VAULT_ENVIRONMENTS.indexOf(this.resolveVaultEnvironment(action)) != -1
    );
  }

  public isProvisioned(action: ActionDto): boolean {
    return action.provision.reduce((pv, cv) => {
      return pv || VAULT_PROVISIONED_ACTION_SET.has(cv);
    }, false);
  }

  public actionToOptions(action: string) {
    const actionOptions: FindArtifactActionOptions = {};
    if (action) {
      const actionArr = action.split('#');
      if (actionArr.length === 2) {
        if (actionArr[0] !== '') {
          if (isActionName(actionArr[0])) {
            actionOptions.action = actionArr[0];
          } else {
            throw new BadRequestException({
              statusCode: 400,
              message: 'Illegal action arguement',
              error: `Check parameters for errors`,
            });
          }
        }
        actionOptions.id = actionArr[1];
      } else if (actionArr.length === 1 && isActionName(actionArr[0])) {
        actionOptions.action = actionArr[0];
      } else {
        throw new BadRequestException({
          statusCode: 400,
          message: 'Illegal action arguement',
          error: `Check parameters for errors`,
        });
      }
    }
    return actionOptions;
  }

  public filterActions(
    actions: ActionDto[] | null,
    actionOptions: FindArtifactActionOptions,
  ): ActionDto[] {
    if (!actions) {
      return [];
    }
    return actions.filter((action) => {
      return Object.entries(actionOptions).every(
        ([k, v]) => !v || action[k] === v,
      );
    });
  }

  public instanceName(action: ActionDto) {
    return INTENTION_INSTANCE_PATHS.reduce<string>((pv, path) => {
      return get(action, path, pv);
    }, undefined);
  }
}
