import { PrimaryKey, Property, SerializedPrimaryKey } from '@mikro-orm/core';
import { ApiHideProperty } from '@nestjs/swagger';
import { ObjectId } from 'mongodb';

export abstract class JwtDto {
  @ApiHideProperty()
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property({ nullable: true })
  client_id?: string;

  @Property({ nullable: true })
  expiry?: string;

  @Property({ nullable: true })
  jti?: string;

  @Property({ nullable: true })
  sub?: string;
}
