import { Embeddable, Embedded } from '@mikro-orm/decorators/legacy';

import { CloudObjectEmbeddable } from './cloud-object.embeddable';
import { CloudDto } from '../dto/cloud.dto';

@Embeddable()
export class CloudEmbeddable {
  constructor(target: CloudObjectEmbeddable) {
    this.target = target;
  }

  static fromDto(dto: CloudDto): CloudEmbeddable {
    const embed = new CloudEmbeddable(
      dto.target
        ? CloudObjectEmbeddable.fromDto(dto.target)
        : new CloudObjectEmbeddable(),
    );
    if (dto.source) {
      embed.source = CloudObjectEmbeddable.fromDto(dto.source);
    }
    return embed;
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
