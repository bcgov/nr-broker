// Shared DTO: Copy in back-end and front-end should be identical

import { CollectionNames } from './collection-dto-union.type';

export class GraphTypeaheadData {
  id!: string;
  collection!: CollectionNames;
  name!: string;
  parentName?: string;
}

export class GraphTypeaheadResult {
  data!: GraphTypeaheadData[];
  meta!: {
    total: number;
  };
}
