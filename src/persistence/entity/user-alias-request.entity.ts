import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  Index,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';

@Entity({ tableName: 'userAliasRequest' })
export class UserAliasRequestEntity {
  @ApiHideProperty()
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  @ApiProperty({ type: () => String })
  @Index()
  accountId: ObjectId;

  @Property()
  createdAt: Date;

  @Property()
  domain: string;

  @Property()
  state: string;
}
