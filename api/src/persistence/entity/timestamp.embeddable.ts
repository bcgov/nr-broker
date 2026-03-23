import { Embeddable, Property } from '@mikro-orm/decorators/legacy';

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
