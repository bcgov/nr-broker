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

import { TimestampEmbeddable } from '../entity/timestamp.embeddable';
import { PackageEmbeddable } from '../../intention/entity/package.embeddable';
import { IntentionActionPointerEmbeddable } from './intention-action-pointer.embeddable';

@Embeddable()
export class PackageBuildApprovalEntity {
  constructor(environment: ObjectId, user: ObjectId, at: Date) {
    this.environment = environment;
    this.user = user;
    this.at = at;
  }

  @Property()
  environment: ObjectId;

  @Property()
  user: ObjectId;

  @Property()
  at: Date;
}

@Entity({ tableName: 'packageBuild' })
@Index({ options: { 'timestamps.createdAt': 1 } })
@Index({ options: { 'timestamps.updatedAt': 1 } })
export class PackageBuildEntity {
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  constructor(
    service: ObjectId,
    name: string,
    action: string,
    intention: ObjectId,
    semvar: string,
    packageEm: PackageEmbeddable,
  ) {
    this.service = service;
    this.name = name;
    this.source = new IntentionActionPointerEmbeddable(action, intention);
    this.semvar = semvar;
    this.package = packageEm;
    this.timestamps = TimestampEmbeddable.create();
  }

  @Embedded({
    entity: () => PackageBuildApprovalEntity,
    array: true,
    nullable: true,
  })
  approval: PackageBuildApprovalEntity[] = [];

  @Embedded(() => IntentionActionPointerEmbeddable, { array: true })
  installed: IntentionActionPointerEmbeddable[] = [];

  @Embedded({
    entity: () => IntentionActionPointerEmbeddable,
    nullable: true,
    object: true,
  })
  source: IntentionActionPointerEmbeddable;

  @Index()
  @Property()
  service: ObjectId;

  @Property()
  name: string;

  @Index()
  @Property()
  semvar: string;

  @Embedded({ entity: () => PackageEmbeddable, object: true })
  package: PackageEmbeddable;

  @Embedded({ entity: () => TimestampEmbeddable, object: true })
  timestamps: TimestampEmbeddable;
}
