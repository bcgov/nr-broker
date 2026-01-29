import { Property, Index, BaseEntity } from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

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
}
