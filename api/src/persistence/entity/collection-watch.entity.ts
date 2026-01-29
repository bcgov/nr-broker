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
import { Expose, Transform } from 'class-transformer';

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
  constructor(vertex: string, user: string, watches: CollectionWatchIdentifierEmbeddable[] = []) {
    super();
    this.vertex = new ObjectId(vertex);
    this.user = new ObjectId(user);
    this.watches = watches;
  }
  @ApiHideProperty()
  @PrimaryKey()
  @Property()
  @Expose({ name: 'id' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value : value?.toString(),
  { toPlainOnly: true },
  )
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  watches: CollectionWatchIdentifierEmbeddable[];

  @Property()
  @ApiProperty({ type: () => String })
  @Transform(({ value }) =>
    typeof value === 'string' ? value : value.toString(),
  { toPlainOnly: true },
  )
  user: ObjectId;
}
