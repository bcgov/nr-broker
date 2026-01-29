import { ApiHideProperty } from '@nestjs/swagger';
import {
  Entity,
  Enum,
  Index,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { CollectionWatchIdentifierEmbeddable } from './collection-watch.entity';
import { CollectionNames, CollectionNameStringEnum } from './collection-entity-union.type';

@Entity({ tableName: 'collectionWatchConfig' })
@Index({ options: { roles: 1 } })
@Index({ options: { vertex: 1 } })
export class CollectionWatchConfigEntity {
  @ApiHideProperty()
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Enum(() => CollectionNameStringEnum)
  collection!: CollectionNames;

  @Property()
  watches: CollectionWatchIdentifierEmbeddable[];

  @Property()
  roles: string[];
}
