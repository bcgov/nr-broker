import { CollectionFieldConfigMap } from './collection-config-rest.dto';

export class CollectionEdgeTarget {
  collection: string;
  id: string;
  name: string;
}

export class CollectionEdgePermissions {
  request: boolean;
}

export class CollectionEdgeConfigRestDto {
  id: string;
  collection: string;
  edge: CollectionEdgeTarget;
  permissions: CollectionEdgePermissions;
  property: CollectionFieldConfigMap;
}
