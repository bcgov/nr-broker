import { ApiHideProperty } from '@nestjs/swagger';
import {
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
import { SyncStatusEmbeddable } from './sync-status.embeddable';

@Entity({ tableName: 'repository' })
export class RepositoryEntity extends VertexPointerEntity {
  @ApiHideProperty()
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  @Index({ options: { collation: { locale: COLLECTION_COLLATION_LOCALE } } })
  name: string;

  @Property({ nullable: true })
  description?: string;

  @Property({ nullable: true })
  type?: string;

  @Property({ nullable: true })
  scmUrl?: string;

  @Property()
  enableSyncSecrets: boolean;

  @Property()
  enableSyncUsers: boolean;

  @Property()
  enableSyncEnvironments: boolean;

  @Embedded({
    entity: () => SyncStatusEmbeddable,
    nullable: true,
    object: true,
  })
  syncSecretsStatus?: SyncStatusEmbeddable;

  @Embedded({
    entity: () => SyncStatusEmbeddable,
    nullable: true,
    object: true,
  })
  syncUsersStatus?: SyncStatusEmbeddable;

  @Embedded({
    entity: () => SyncStatusEmbeddable,
    nullable: true,
    object: true,
  })
  syncEnvironmentsStatus?: SyncStatusEmbeddable;
}
