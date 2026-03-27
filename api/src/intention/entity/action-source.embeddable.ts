import { Embeddable, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty } from '@nestjs/swagger';
import { ObjectId } from 'mongodb';

@Embeddable()
export class ActionSourceEmbeddable {
  constructor(action: string, intention: ObjectId) {
    this.action = action;
    this.intention = intention;
  }

  @Property({ nullable: true })
  action?: string;

  @Property()
  @ApiProperty({ type: () => String })
  intention: ObjectId;
}
