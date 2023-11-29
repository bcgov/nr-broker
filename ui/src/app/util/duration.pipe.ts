import { Pipe, PipeTransform } from '@angular/core';
import prettyMilliseconds from 'pretty-ms';

@Pipe({
  name: 'duration',
  standalone: true,
})
export class DurationPipe implements PipeTransform {
  transform(value: number | number[], options?: any): unknown {
    if (Array.isArray(value)) {
      return value.map((val) => prettyMilliseconds(val, options));
    }

    return prettyMilliseconds(value, options);
  }
}
