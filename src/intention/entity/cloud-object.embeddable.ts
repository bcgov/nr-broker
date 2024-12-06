import { Embeddable, Embedded, Enum, Property } from '@mikro-orm/core';
import { EdgePropEmbeddable } from '../../persistence/entity/edge-prop.embeddable';

@Embeddable()
class CloudObjectAccountEmbeddable {
  @Property({ nullable: true })
  id?: string;

  @Property({ nullable: true })
  name?: string;
}

@Embeddable()
class CloudObjectInstanceEmbeddable {
  @Property({ nullable: true })
  id?: string;

  @Property({ nullable: true })
  name?: string;
}

@Embeddable()
class CloudObjectMachineEmbeddable {
  constructor(type: string) {
    this.type = type;
  }

  @Property()
  type: string;
}

@Embeddable()
class CloudObjectProjectEmbeddable {
  @Property({ nullable: true })
  id?: string;

  @Property({ nullable: true })
  name?: string;
}

@Embeddable()
class CloudObjectServiceEmbeddable {
  constructor(name: string) {
    this.name = name;
  }
  @Property()
  name: string;
}

export enum PROP_STRATEGY_VALUES {
  merge = 'merge',
  replace = 'replace',
}

@Embeddable()
export class CloudObjectEmbeddable {
  // fromDto(cloudObjectDto: CloudObjectDto) {
  //   new CloudObjectEmbeddable();
  // }
  @Embedded({
    entity: () => CloudObjectAccountEmbeddable,
    nullable: true,
    object: true,
  })
  account?: CloudObjectAccountEmbeddable;

  @Property({ nullable: true })
  availability_zone?: string;

  @Embedded({
    entity: () => CloudObjectInstanceEmbeddable,
    nullable: true,
    object: true,
  })
  instance?: CloudObjectInstanceEmbeddable;

  @Embedded({
    entity: () => CloudObjectMachineEmbeddable,
    nullable: true,
    object: true,
  })
  machine?: CloudObjectMachineEmbeddable;

  @Embedded({
    entity: () => CloudObjectProjectEmbeddable,
    nullable: true,
    object: true,
  })
  project?: CloudObjectProjectEmbeddable;

  @Embedded({ entity: () => EdgePropEmbeddable, nullable: true, object: true })
  prop?: EdgePropEmbeddable;

  @Enum({ items: () => PROP_STRATEGY_VALUES, nullable: true })
  propStrategy?: PROP_STRATEGY_VALUES;

  @Property({ nullable: true })
  provider?: string;

  @Property({ nullable: true })
  region?: string;

  @Embedded({
    entity: () => CloudObjectServiceEmbeddable,
    nullable: true,
    object: true,
  })
  service?: CloudObjectServiceEmbeddable;
}
