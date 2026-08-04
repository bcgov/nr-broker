import { BaseEntity } from '@mikro-orm/core';
import {
  Embedded,
  Entity,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
  Index,
} from '@mikro-orm/decorators/legacy';
import { ObjectId } from 'mongodb';
import {
  SyncQueueRequirementEmbeddable,
  SyncQueueSetupEmbeddable,
} from './sync-queue-config.embeddable';

@Entity({ tableName: 'syncQueueConfig' })
export class SyncQueueConfigEntity extends BaseEntity {
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  @Index({ options: { unique: true } })
  queue!: string;

  @Property()
  label!: string;

  @Property()
  summary!: string;

  @Property()
  description!: string[];

  @Property()
  types!: string[];

  @Embedded({ entity: () => SyncQueueSetupEmbeddable, object: true, nullable: true })
  setup?: SyncQueueSetupEmbeddable;

  @Embedded({
    entity: () => SyncQueueRequirementEmbeddable,
    object: true,
    nullable: true,
  })
  requires?: SyncQueueRequirementEmbeddable;
}
