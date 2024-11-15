import { BadRequestException, Injectable } from '@nestjs/common';
import { get } from 'lodash';
import ejs from 'ejs';
import {
  INTENTION_SERVICE_ENVIRONMENT_SEARCH_PATHS,
  INTENTION_SERVICE_INSTANCE_SEARCH_PATHS,
  VAULT_ENVIRONMENTS,
  VAULT_PROVISIONED_ACTION_SET,
} from '../constants';
import { ActionDto, isActionName } from '../intention/dto/action.dto';
import { IntentionEntity } from '../intention/dto/intention.entity';

export type FindArtifactActionOptions = Partial<
  Pick<ActionDto, 'action' | 'id'>
>;

export interface SemverVersion {
  major: string | undefined;
  minor: string | undefined;
  patch: string | undefined;
  prerelease: string | undefined;
  build: string | undefined;
}

@Injectable()
export class ActionUtil {
  private readonly AUDIT_URL_TEMPLATE = process.env.AUDIT_URL_TEMPLATE
    ? process.env.AUDIT_URL_TEMPLATE
    : '';
  private readonly VERSION_REGEX =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

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
    if (!actionOptions.action && !actionOptions.id) {
      return actions;
    }
    return actions.filter((action) => {
      return Object.entries(actionOptions).every(
        ([k, v]) => !v || action[k] === v,
      );
    });
  }

  public actionToIdString(action: ActionDto) {
    return `${action.action}#${action.id}`;
  }

  public environmentName(action: ActionDto) {
    return INTENTION_SERVICE_ENVIRONMENT_SEARCH_PATHS.reduce<string>(
      (pv, path) => {
        return get({ action }, path, pv);
      },
      undefined,
    );
  }

  public instanceName(action: ActionDto) {
    return INTENTION_SERVICE_INSTANCE_SEARCH_PATHS.reduce<string>(
      (pv, path) => {
        return get({ action }, path, pv);
      },
      undefined,
    );
  }

  /**
   * Renders the audit url for the intention passed in
   * @param intention The intention to create the audit url for
   * @returns The audit url string
   */
  public auditUrlForIntention(intention: IntentionEntity): string {
    return ejs.render(this.AUDIT_URL_TEMPLATE, { intention });
  }

  public parseVersion(version: string): SemverVersion | null {
    const val = this.VERSION_REGEX.exec(version);
    return val
      ? {
          major: val[1],
          minor: val[2],
          patch: val[3],
          prerelease: val[4],
          build: val[5],
        }
      : null;
  }

  public isStrictSemver(parsedVersion: SemverVersion | null) {
    return (
      parsedVersion &&
      parsedVersion.major !== undefined &&
      parsedVersion.minor !== undefined &&
      parsedVersion.patch !== undefined
    );
  }
}
