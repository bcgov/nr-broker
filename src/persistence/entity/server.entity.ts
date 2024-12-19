import { ApiHideProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { VertexPointerEntity } from '../entity/vertex-pointer.entity';

@Entity({ tableName: 'server' })
export class ServerEntity extends VertexPointerEntity {
  @ApiHideProperty()
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  acquired: Date;

  @Property({ nullable: true })
  architecture?: string;

  @Property({ nullable: true })
  description?: string;

  @Property()
  hostName: string;

  @Property()
  name: string;

  @Property({ nullable: true })
  osFamily?: string;

  @Property({ nullable: true })
  osFull?: string;

  @Property({ nullable: true })
  osKernel?: string;

  @Property({ nullable: true })
  osName?: string;

  @Property({ nullable: true })
  osType?: string;

  @Property({ nullable: true })
  osPlatform?: string;

  @Property({ nullable: true })
  osVersion?: string;
}
