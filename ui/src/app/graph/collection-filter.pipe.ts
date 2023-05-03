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

    return returnObj;
  }
}
