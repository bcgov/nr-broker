import { Embeddable, Property } from '@mikro-orm/decorators/legacy';

@Embeddable()
export class SyncQueueRequirementEmbeddable {
  @Property({ nullable: true })
  health?: string;

  @Property({ nullable: true })
  value?: boolean | string;

  @Property({ nullable: true })
  envAll?: string[];
}

@Embeddable()
export class SyncQueueSetupEmbeddable {
  @Property({ nullable: true })
  gitHubUserLink?: boolean;
}
