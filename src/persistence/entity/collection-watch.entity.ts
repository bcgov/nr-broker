import { ApiHideProperty } from '@nestjs/swagger';
import {
  Entity,
  Index,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { VertexPointerEntity } from './vertex-pointer.entity';
//import { COLLECTION_COLLATION_LOCALE } from '../../constants';

@Entity({ tableName: 'collectionWatch' })
export class CollectionWatchEntity extends VertexPointerEntity {
  @ApiHideProperty()
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  collectionId: string;

  @Property()
  //@Index({ options: { collation: { locale: COLLECTION_COLLATION_LOCALE } } })
  userId: string;

  @Property()
  channel: string;

  @Property()
  events: string[];
}
