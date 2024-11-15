import { Embeddable, Property } from '@mikro-orm/core';

@Embeddable()
export class PointGeom {
  @Property()
  type: 'Point';

  @Property()
  coordinates: number[];
}
