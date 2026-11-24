import { Embeddable, Property } from '@mikro-orm/decorators/legacy';
import { SyncResult } from '../dto/sync-status.dto';

@Embeddable()
export class SyncStatusEmbeddable {
  @Property({ nullable: true })
  queuedAt?: Date;

  @Property({ nullable: true })
  syncAt?: Date;

  @Property({ type: 'string', nullable: true })
  state?: SyncResult['state'];

  @Property({ nullable: true })
  errorCode?: string;

  @Property({ nullable: true })
  errorMessage?: string;

  static create() {
    const syncStatus = new SyncStatusEmbeddable();
    return syncStatus;
  }
}
