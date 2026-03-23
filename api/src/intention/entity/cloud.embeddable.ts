import { Embeddable, Embedded } from '@mikro-orm/decorators/legacy';

import { CloudObjectEmbeddable } from './cloud-object.embeddable';

@Embeddable()
export class CloudEmbeddable {
  constructor(target: CloudObjectEmbeddable) {
    this.target = target;
  }

  @Embedded({
    entity: () => CloudObjectEmbeddable,
    nullable: true,
    object: true,
  })
  source?: CloudObjectEmbeddable;

  @Embedded({ entity: () => CloudObjectEmbeddable, object: true })
  target: CloudObjectEmbeddable;
}
