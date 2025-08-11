import { Injectable } from '@angular/core';
import prettyMilliseconds from 'pretty-ms';
import delve from 'dlv';

import { IntentionDto } from '../service/intention/dto/intention.dto';

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
}
