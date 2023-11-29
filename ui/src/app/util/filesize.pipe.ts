import { Pipe, PipeTransform } from '@angular/core';
import { filesize } from 'filesize';

@Pipe({
  name: 'filesize',
  standalone: true,
})
export class FilesizePipe implements PipeTransform {
  transform(value: number | number[], options?: any): unknown {
    if (Array.isArray(value)) {
      return value.map((val) => filesize(val, options));
    }

    return filesize(value, options);
  }
}
