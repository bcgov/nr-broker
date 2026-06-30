import { BaseEntity } from '@mikro-orm/core';
import {
  Entity,
  Index,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/decorators/legacy';
import { ObjectId } from 'mongodb';

@Entity({ tableName: 'communicationTemplate' })
export class CommunicationTemplateEntity extends BaseEntity {
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  @Index({ options: { unique: true } })
  key: string;

  @Property()
  email: string;

  @Property()
  subject: string;
}
