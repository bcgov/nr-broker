import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'yesno',
  standalone: true,
})
export class YesNoPipe implements PipeTransform {
  transform(value: unknown): unknown {
    return value ? 'Yes' : 'No';
  }
}
