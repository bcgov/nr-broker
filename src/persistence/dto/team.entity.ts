import { ApiHideProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { VertexPointerDto } from './vertex-pointer.dto';

@Entity({ tableName: 'team' })
export class TeamEntity extends VertexPointerDto {
  @ApiHideProperty()
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  email: string;

  @Property()
  name: string;

  @Property({ nullable: true })
  website?: string;
}
