import { Injectable } from '@angular/core';
import prettyMilliseconds from 'pretty-ms';
import { IntentionDto } from '../service/intention/dto/intention.dto';

@Injectable({
  providedIn: 'root',
})
export class IntentionUtilService {
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
