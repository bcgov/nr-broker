import { Injectable } from '@nestjs/common';

export const INTERVAL_HOUR_MS = 3600000;

@Injectable()
export class DateUtil {
  public computeIndex(index: string, start: Date, end: Date) {
    if (index.endsWith('-d')) {
      const indexArr = index.split(',');
      const indexPrefix = indexArr.pop().slice(0, -2);
      return `${indexArr.length > 0 ? indexArr.join(',') + ',' : ''}${this.getDatesInRange(
        start,
        end,
      )
        .map((date) => `${indexPrefix}-${date}`)
        .join(',')}`;
    } else {
      return index;
    }
  }

  public getDatesInRange(start: Date, end: Date): string[] {
    const dates: string[] = [];
    const currentDate = new Date(start);
    const endEod = this.getUtcEod(end);

    // Iterate through dates from start to end
    while (currentDate <= endEod) {
      // Format the date as yyyy-mm-dd in UTC timezone
      const formattedDate = currentDate.toISOString().split('T')[0];

      // Add formatted date to array
      dates.push(formattedDate);

      // Move to the next day
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    return dates;
  }

  private getUtcEod(date: Date) {
    const utcEodMs = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    );
    return new Date(utcEodMs);
  }
}
