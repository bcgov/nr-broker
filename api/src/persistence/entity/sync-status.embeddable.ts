import { Embeddable, Property } from '@mikro-orm/core';

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
