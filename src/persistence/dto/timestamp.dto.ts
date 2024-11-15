import { Embeddable, Index, Property } from '@mikro-orm/core';

@Embeddable()
export class TimestampDto {
  @Index()
  @Property()
  createdAt: Date;

  @Index()
  @Property({ nullable: true })
  updatedAt?: Date;

  static create() {
    const ts = new TimestampDto();
    ts.createdAt = new Date();
    return ts;
  }
}
