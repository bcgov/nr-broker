import {
  BaseEntity,
  Entity,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';

@Entity({ tableName: 'connectionConfig' })
export class ConnectionConfigEntity extends BaseEntity {
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  collection: string;

  @Property()
  description: string;

  @Property()
  href: string;

  @Property()
  name: string;

  @Property()
  order: number;
}
