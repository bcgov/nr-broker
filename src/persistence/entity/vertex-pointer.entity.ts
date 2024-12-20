import { Property, Index, BaseEntity } from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { ApiProperty } from '@nestjs/swagger';

export abstract class VertexPointerEntity extends BaseEntity {
  @Property()
  @ApiProperty({ type: () => String })
  @Index()
  vertex: ObjectId;

  @Property({ nullable: true })
  @Index()
  tags?: string[];
}
