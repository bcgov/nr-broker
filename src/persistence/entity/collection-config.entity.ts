import {
  Entity,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
  Index,
  BaseEntity,
  Embeddable,
  Embedded,
  Enum,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import {
  CollectionEdgeConfig,
  CollectionFieldConfigMap,
} from '../dto/collection-config.dto';
import { CollectionNameStringEnum } from './collection-entity-union.type';

@Embeddable()
export class CollectionConfigPermissionsEmbeddable {
  @Property()
  browse: boolean;

  @Property()
  create: boolean;

  @Property()
  filter: boolean;

  @Property()
  update: boolean;

  @Property()
  delete: boolean;
}

@Embeddable()
export class CollectionConfigParentEmbeddable {
  @Property()
  edgeName: string;
}

@Embeddable()
export class CollectionFieldConfigMapEmbeddable {
  @Property()
  getPath: string;

  @Property()
  setPath: string;
}

@Embeddable()
export class CollectionFieldDefaultSortEmbeddable {
  @Property()
  field: string;

  @Property()
  dir: 1 | -1;
}

@Embeddable()
export class CollectionSyncConfigEmbeddable {
  @Property()
  index!: string;

  @Property()
  unique!: string;

  // Type json because of no defined keys of map
  @Property({
    type: 'json',
    nullable: true,
  })
  map!: {
    [key: string]:
      | {
          type: 'first';
          dest: string;
        }
      | {
          type: 'pick';
          endsWith: string[];
          dest: string;
        };
  };
}

@Embeddable()
export class CollectionMapEmbeddable {
  @Property()
  getPath!: string;

  @Property()
  setPath!: string;
}

@Embeddable()
export class GitHubEdgeToRolesEmbeddable {
  @Property()
  edge: string[];

  @Property()
  role!: string;
}

@Embeddable()
export class ConnectedTableConfigEmbeddable {
  @Enum(() => CollectionNameStringEnum)
  collection: CollectionNameStringEnum;

  @Property()
  direction!: string;
}

@Entity({ tableName: 'collectionConfig' })
export class CollectionConfigEntity extends BaseEntity {
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  browseFields: string[];

  @Enum(() => CollectionNameStringEnum)
  @Index()
  collection: CollectionNameStringEnum;

  @Embedded({
    entity: () => CollectionMapEmbeddable,
    array: true,
  })
  collectionMapper: CollectionMapEmbeddable[];

  @Property()
  collectionVertexName: string;

  @Property()
  color: string;

  @Embedded({
    entity: () => ConnectedTableConfigEmbeddable,
    array: true,
    nullable: true,
  })
  connectedTable?: ConnectedTableConfigEmbeddable[];

  @Embedded({
    entity: () => GitHubEdgeToRolesEmbeddable,
    array: true,
    nullable: true,
  })
  edgeToRoles?: GitHubEdgeToRolesEmbeddable[];

  @Property({
    type: 'json',
  })
  edges: CollectionEdgeConfig[];

  @Property({
    type: 'json',
  })
  fields: CollectionFieldConfigMap;

  @Embedded({
    entity: () => CollectionFieldDefaultSortEmbeddable,
    object: true,
  })
  fieldDefaultSort: CollectionFieldDefaultSortEmbeddable;

  @Property()
  hint: string;

  @Property()
  index: number;

  @Property()
  name: string;

  @Embedded({
    entity: () => CollectionConfigParentEmbeddable,
    object: true,
  })
  parent: CollectionConfigParentEmbeddable;

  @Embedded({
    entity: () => CollectionConfigPermissionsEmbeddable,
    object: true,
  })
  permissions: CollectionConfigPermissionsEmbeddable;

  @Property()
  show: boolean;

  @Embedded({
    entity: () => CollectionSyncConfigEmbeddable,
    object: true,
    nullable: true,
  })
  sync?: CollectionSyncConfigEmbeddable;
}
