import { Injectable } from '@angular/core';
import prettyMilliseconds from 'pretty-ms';
import delve from 'dlv';

import { IntentionDto } from '../service/intention/dto/intention.dto';
import { ACTION_NAMES, ActionDto } from '../service/intention/dto/action.dto';

export type FindArtifactActionOptions = Partial<
  Pick<ActionDto, 'action' | 'id'>
>;

@Injectable({
  providedIn: 'root',
})
export class IntentionUtilService {
  actionValueSet(
    intention: IntentionDto,
    key: string,
    actionServiceFilter = '',
  ) {
    const actions = intention?.actions ?? [];
    return new Set<string>(
      actions
        .filter((action: any) => {
          return (
            actionServiceFilter === '' ||
            action.service.name === actionServiceFilter
          );
        })
        .map((action: any) => {
          return this.actionValue(action, key);
        }),
    );
  }

  actionValue(action: any, key: string): string {
    return delve(action, key);
  }

  totalDuration(intention: IntentionDto) {
    return intention.transaction?.duration
      ? prettyMilliseconds(intention.transaction.duration)
      : '';
  }

  normalizedProgress(intention: IntentionDto) {
    let progressCnt = 0;
    if (intention.actions) {
      progressCnt = intention.actions.reduce(
        (currentValue: number, action: any) => {
          if (action.trace.outcome) {
            return 2 + currentValue;
          } else if (action.trace.start) {
            return 1 + currentValue;
          }
          return currentValue;
        },
        0,
      );
    }
    return Math.round((progressCnt / (intention.actions.length * 2)) * 100);
  }

  public actionToOptions(action: string) {
    const actionOptions: FindArtifactActionOptions = {};
    if (action) {
      const actionArr = action.split('#');
      if (actionArr.length === 2) {
        if (actionArr[0] !== '') {
          actionOptions.action = actionArr[0] as ACTION_NAMES;
        }
        actionOptions.id = actionArr[1];
      } else if (
        actionArr.length === 1
      ) {
        actionOptions.action = actionArr[0] as ACTION_NAMES;
      } else {
        throw new Error('Illegal action argument');
      }
    }
    return actionOptions;
  }

  public filterActions<T extends ActionDto>(
    actions: T[] | null,
    actionOptions: FindArtifactActionOptions,
  ): T[] {
    if (!actions) {
      return [];
    }
    if (!actionOptions.action && !actionOptions.id) {
      return actions;
    }
    return actions.filter((action) => {
      return Object.entries(actionOptions).every(
        ([k, v]) => !v || action[k as keyof T] === v,
      );
    });
  }
}
