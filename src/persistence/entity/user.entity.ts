import { ApiHideProperty } from '@nestjs/swagger';
import {
  Embeddable,
  Embedded,
  Entity,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { VertexPointerEntity } from './vertex-pointer.entity';

@Embeddable()
export class UserAliasEmbeddable {
  @Property()
  domain: string;

  @Property()
  guid: string;

  @Property()
  name: string;

  @Property()
  username: string;
}

@Entity({ tableName: 'user' })
export class UserEntity extends VertexPointerEntity {
  @ApiHideProperty()
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Embedded(() => UserAliasEmbeddable, { array: true, nullable: true })
  alias?: UserAliasEmbeddable[];

  @Property()
  domain: string;

  @Property()
  email: string;

  @Property()
  guid: string;

  @Property()
  name: string;

  @Property()
  username: string;
}
