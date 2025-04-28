import {
  Entity,
  Index,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { ApiHideProperty } from '@nestjs/swagger';
import { VertexPointerEntity } from './vertex-pointer.entity';
import { COLLECTION_COLLATION_LOCALE } from '../../constants';
import { ENVIRONMENT_NAMES } from '../../intention/dto/constants.dto';

@Entity({ tableName: 'environment' })
export class EnvironmentEntity extends VertexPointerEntity {
  @ApiHideProperty()
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  @Index({ options: { collation: { locale: COLLECTION_COLLATION_LOCALE } } })
  name: ENVIRONMENT_NAMES;

  @Property()
  short: string;

  @Property()
  aliases: string[];

  @Property()
  changeRoles: string[];

  @Property()
  title: string;

  @Property()
  position: number;
}
