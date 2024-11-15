import { Embeddable, Property } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { ObjectId } from 'mongodb';

@Embeddable()
export class UserGroupDto {
  @Property()
  domain: string;

  @Property()
  @ApiProperty({ type: () => String })
  id: ObjectId;

  @Property()
  name: string;
}
