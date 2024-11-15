import { Property, Index } from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { ApiProperty } from '@nestjs/swagger';

export abstract class VertexPointerDto {
  @Property()
  @ApiProperty({ type: () => String })
  @Index()
  vertex: ObjectId;

  @Property({ nullable: true })
  @Index()
  tags?: string[];
}
