import { ApiHideProperty } from '@nestjs/swagger';
import {
  Embedded,
  Entity,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { VertexPointerDto } from './vertex-pointer.dto';
import { IntentionActionPointerDto } from './intention-action-pointer.dto';

@Entity({ tableName: 'serviceInstance' })
export class ServiceInstanceEntity extends VertexPointerDto {
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

  @Embedded({ entity: () => IntentionActionPointerDto, nullable: true })
  action?: IntentionActionPointerDto;

  @Embedded(() => IntentionActionPointerDto, { array: true, nullable: true })
  actionHistory?: IntentionActionPointerDto[];
}
