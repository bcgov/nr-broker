import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'camelToTitle',
})
export class CamelToTitlePipe implements PipeTransform {
  transform(value: string): unknown {
    return value
      .replace(/[A-Z]/g, (letter: string) => ` ${letter.toUpperCase()}`)
      .replace(/^[a-z]/g, (letter: string) => `${letter.toUpperCase()}`);
  }
}
