import { Embeddable, Index, Property } from '@mikro-orm/core';

@Embeddable()
export class TimestampEmbeddable {
  @Index()
  @Property()
  createdAt: Date;

  @Index()
  @Property({ nullable: true })
  updatedAt?: Date;

  static create() {
    const ts = new TimestampEmbeddable();
    ts.createdAt = new Date();
    return ts;
  }
}
