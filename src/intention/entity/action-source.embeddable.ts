import { Embeddable, Property } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { ObjectId } from 'mongodb';

@Embeddable()
export class ActionSourceEmbeddable {
  @Property({ nullable: true })
  action?: string;

  @Property()
  @ApiProperty({ type: () => String })
  intention: ObjectId;
}
