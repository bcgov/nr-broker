import { BaseEntity } from '@mikro-orm/core';
import { Property, Index } from '@mikro-orm/decorators/legacy';
import { ObjectId } from 'mongodb';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { CollectionSource } from '../dto/vertex-pointer.dto';

export abstract class VertexPointerEntity extends BaseEntity {
  @Property()
  @ApiProperty({ type: () => String })
  @Index()
  @Transform(({ value }) =>
    typeof value === 'string' ? value : value?.toString(),
  { toPlainOnly: true },
  )
  vertex: ObjectId;

  @Property({ nullable: true })
  @Index()
  tags?: string[];

  /**
   * Latest automated source to update this item. Null if manually managed.
   */
  @Property({ nullable: true })
  @ApiProperty({ required: false, nullable: true, type: () => String })
  source?: CollectionSource | null;
}
