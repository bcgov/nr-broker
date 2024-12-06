import { Embeddable, Property } from '@mikro-orm/core';

@Embeddable()
export class ArtifactEmbeddable {
  constructor(name: string) {
    this.name = name;
  }
  @Property({ nullable: true })
  checksum?: string;

  @Property()
  name: string;

  @Property({ nullable: true })
  size?: number;

  @Property({ nullable: true })
  type?: string;
}
