import { Injectable, inject } from '@angular/core';
import { CollectionNames } from '../service/persistence/dto/collection-dto-union.type';

import { CONFIG_RECORD } from '../app-initialize.factory';
import { CollectionConfigNameRecord } from '../service/graph.types';

@Injectable({
  providedIn: 'root',
})
export class StringUtilService {
  readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);


  snakecase(str: string) {
    if (!str) {
      return str;
    }
    return str.replace(
      /[A-Z]/g,
      (letter: string) => `-${letter.toLowerCase()}`,
    );
  }

  toCollectionName(collection: string): CollectionNames {
    if (this.configRecord[collection as CollectionNames] !== undefined) {
      return collection as CollectionNames;
    } else {
      return 'project';
    }
  }
}
