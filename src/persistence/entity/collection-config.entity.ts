import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
  Index,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import {
  CollectionEdgeConfig,
  CollectionEdgeInstanceConfig,
  CollectionFieldConfigMap,
  CollectionMap,
  CollectionSyncConfig,
} from '../dto/collection-config.dto';
import { EdgeEntity } from './edge.entity';
import { CollectionEntityUnion } from './collection-entity-union.type';

@Entity({ tableName: 'collectionConfig' })
export class CollectionConfigEntity {
  @ApiHideProperty()
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  browseFields: string[];

  @Property()
  @Index()
  @ApiProperty({ type: () => String })
  collection: keyof CollectionEntityUnion;

  @Property()
  collectionMapper: CollectionMap[];

  @Property()
  collectionVertexName: string;

  @Property()
  color: string;

  @Property()
  edges: CollectionEdgeConfig[];

  @Property()
  fields: CollectionFieldConfigMap;

  @Property()
  fieldDefaultSort: {
    field: string;
    dir: 1 | -1;
  };

  @Property()
  hint: string;

  @Property()
  index: number;

  @Property()
  name: string;

  @Property({ nullable: true })
  ownableCollections?: string[];

  @Property()
  parent: {
    edgeName: string;
  };

  @Property()
  permissions: {
    browse: boolean;
    create: boolean;
    filter: boolean;
    update: boolean;
    delete: boolean;
  };

  @Property()
  show: boolean;

  @Property({ nullable: true })
  sync?: CollectionSyncConfig;
}

export type CollectionConfigInstanceDto = Omit<
  CollectionConfigEntity,
  'edges'
> & {
  edge: CollectionEdgeInstanceConfig;
  instance: EdgeEntity;
};
