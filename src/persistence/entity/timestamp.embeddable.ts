import { Embeddable, Property } from '@mikro-orm/core';

@Embeddable()
export class TimestampEmbeddable {
  @Property()
  createdAt: Date;

  @Property({ nullable: true })
  updatedAt?: Date;

  static create() {
    const ts = new TimestampEmbeddable();
    ts.createdAt = new Date();
    return ts;
  }
}
