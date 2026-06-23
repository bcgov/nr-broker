import { Embeddable, Property } from '@mikro-orm/decorators/legacy';

@Embeddable()
export class RoleChipMappingEmbeddable {
  @Property()
  role!: string;

  @Property()
  label!: string;

  @Property()
  description!: string;
}
