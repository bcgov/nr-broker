import { BaseEntity } from '@mikro-orm/core';
import {
  Entity,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
  Index,
} from '@mikro-orm/decorators/legacy';
import { ObjectId } from 'mongodb';
import {
  CollectionSyncRequirement,
} from '../dto/sync-queue-config.dto';

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

  @Property({ type: 'json' })
  description!: string[];

  @Property({ type: 'json', nullable: true })
  requires?: CollectionSyncRequirement;
}
