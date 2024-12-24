import {
  BaseEntity,
  Embeddable,
  Embedded,
  Entity,
  Index,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';

@Embeddable()
export class UserPermissionEmbeddable {
  @Property()
  name: string;

  @Property()
  index: number;

  @Property()
  permissions: string[];
}

@Entity({ tableName: 'graphPermission' })
export class GraphPermissionEntity extends BaseEntity {
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  @Index()
  name: string;

  @Embedded({ entity: () => UserPermissionEmbeddable, array: true })
  data: UserPermissionEmbeddable[];
}
