import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import {
  Embeddable,
  Entity,
  Index,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { VertexPointerEntity } from './vertex-pointer.entity';

@Embeddable()
export class CollectionWatchIdentifierEmbeddable {
  @Property()
  channel: string;

  @Property({ nullable: true })
  events?: string[];
}

@Entity({ tableName: 'collectionWatch' })
@Index({ options: { user: 1 } })
@Index({ options: { vertex: 1 } })
export class CollectionWatchEntity extends VertexPointerEntity {
  @ApiHideProperty()
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  watches: CollectionWatchIdentifierEmbeddable[];

  @Property()
  @ApiProperty({ type: () => String })
  user: ObjectId;
}
