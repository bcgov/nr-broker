import { Embeddable, Property } from '@mikro-orm/decorators/legacy';

@Embeddable()
export class SyncStatusEmbeddable {
  @Property({ nullable: true })
  queuedAt?: Date;

  @Property({ nullable: true })
  syncAt?: Date;

  static create() {
    const syncStatus = new SyncStatusEmbeddable();
    return syncStatus;
  }
}
