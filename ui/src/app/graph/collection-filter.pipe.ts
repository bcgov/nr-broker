import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'collectionFilter',
  standalone: true,
})
export class CollectionFilterPipe implements PipeTransform {
  transform(value: any): any {
    const returnObj = {
      ...value,
    };

    delete returnObj.id;
    delete returnObj.vertex;
    delete returnObj.name;

    for (const key of Object.keys(returnObj)) {
      if (
        Array.isArray(returnObj[key]) &&
        (returnObj[key].length === 0 || typeof returnObj[key][0] !== 'string')
      ) {
        delete returnObj[key];
      }
    }

    return returnObj;
  }
}
