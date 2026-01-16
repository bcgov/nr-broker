import { Embeddable, Property } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { ObjectId } from 'mongodb';

@Embeddable()
export class UserGroupEmbeddable {
  constructor(domain: string, id: ObjectId, name: string) {
    this.domain = domain;
    this.id = id;
    this.name = name;
  }

  @Property()
  domain: string;

  @Property()
  @ApiProperty({ type: () => String })
  id: ObjectId;

  @Property()
  name: string;
}
