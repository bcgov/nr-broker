import { Embeddable, Property } from '@mikro-orm/decorators/legacy';

@Embeddable()
export class PointGeomEmbeddable {
  @Property()
  type: 'Point';

  @Property()
  coordinates: number[];
}
