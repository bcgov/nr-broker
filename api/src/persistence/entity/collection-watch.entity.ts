import { ApiHideProperty } from '@nestjs/swagger';
import {
  Embeddable,
  Entity,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { VertexPointerEntity } from './vertex-pointer.entity';

@Embeddable()
export class CollectionWatchIdentifierEmbeddable {
  @Property()
  channel: string;

  @Property()
  event: string;
}

@Entity({ tableName: 'collectionWatch' })
export class CollectionWatchEntity extends VertexPointerEntity {
  @ApiHideProperty()
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  watchIdentifier: CollectionWatchIdentifierEmbeddable;

  @Property()
  userId: string;
}
