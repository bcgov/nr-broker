import { ApiHideProperty } from '@nestjs/swagger';
import {
  Entity,
  Index,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/decorators/legacy';
import { ObjectId } from 'mongodb';
import { VertexPointerEntity } from './vertex-pointer.entity';
import { COLLECTION_COLLATION_LOCALE } from '../../constants';

@Entity({ tableName: 'cloud', discriminatorColumn: 'type' })
export class CloudEntity extends VertexPointerEntity {
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

  @Property()
  type: string;
}
