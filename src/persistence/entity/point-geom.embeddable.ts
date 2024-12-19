import { Embeddable, Property } from '@mikro-orm/core';

@Embeddable()
export class PointGeomEmbeddable {
  @Property()
  type: 'Point';

  @Property()
  coordinates: number[];
}
