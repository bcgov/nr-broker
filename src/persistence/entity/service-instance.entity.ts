import { ApiHideProperty } from '@nestjs/swagger';
import {
  Embedded,
  Entity,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { VertexPointerEntity } from './vertex-pointer.entity';
import { IntentionActionPointerEmbeddable } from './intention-action-pointer.embeddable';

@Entity({ tableName: 'serviceInstance' })
export class ServiceInstanceEntity extends VertexPointerEntity {
  @ApiHideProperty()
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  name: string;

  @Property({ nullable: true })
  url?: string;

  @Embedded({
    entity: () => IntentionActionPointerEmbeddable,
    nullable: true,
    object: true,
  })
  action?: IntentionActionPointerEmbeddable;

  @Embedded(() => IntentionActionPointerEmbeddable, {
    array: true,
    nullable: true,
    object: true,
  })
  actionHistory?: IntentionActionPointerEmbeddable[];
}
