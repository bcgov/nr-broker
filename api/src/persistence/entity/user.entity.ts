import { ApiHideProperty } from '@nestjs/swagger';
import {
  Embeddable,
  Embedded,
  Entity,
  Index,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { VertexPointerEntity } from './vertex-pointer.entity';
import { COLLECTION_COLLATION_LOCALE } from '../../constants';

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
  @Index({ options: { collation: { locale: COLLECTION_COLLATION_LOCALE } } })
  name: string;

  @Property()
  username: string;
}
