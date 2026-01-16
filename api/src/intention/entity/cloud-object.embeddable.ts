import { Embeddable, Embedded, Enum, Property } from '@mikro-orm/core';
import { EdgePropEmbeddable } from '../../persistence/entity/edge-prop.embeddable';
import { CloudObjectDto } from '../dto/cloud-object.dto';

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
  static merge(...theArgs: Array<CloudObjectDto | CloudObjectEmbeddable>) {
    const rval = new CloudObjectEmbeddable();
    for (const arg of theArgs) {
      if (arg.account || rval.account) {
        rval.account = rval.account ?? new CloudObjectAccountEmbeddable();
        rval.account.id = arg.account?.id ?? rval.account.id;
        rval.account.name = arg.account?.name ?? rval.account.name;
      }

      rval.availability_zone = arg.availability_zone ?? rval.availability_zone;

      if (arg.instance || rval.instance) {
        rval.instance = rval.instance ?? new CloudObjectInstanceEmbeddable();
        rval.instance.id = arg.instance?.id ?? rval.instance.id;
        rval.instance.name = arg.instance?.name ?? rval.instance.name;
      }

      if (arg.machine) {
        rval.machine = new CloudObjectMachineEmbeddable(arg.machine.type);
      }

      if (arg.project || rval.project) {
        rval.project = rval.project ?? new CloudObjectInstanceEmbeddable();
        rval.project.id = arg.project?.id ?? rval.project.id;
        rval.project.name = arg.project?.name ?? rval.project.name;
      }
      if (arg.prop) {
        rval.prop = rval.prop ?? new EdgePropEmbeddable();
        for (const [key, value] of Object.entries(arg.prop)) {
          rval.prop[key] = value;
        }
      }

      rval.propStrategy =
        PROP_STRATEGY_VALUES[arg.propStrategy] ??
        PROP_STRATEGY_VALUES[rval.propStrategy];
      rval.provider = arg.provider ?? rval.provider;
      rval.region = arg.region ?? rval.region;

      if (arg.service) {
        rval.service = new CloudObjectServiceEmbeddable(arg.service.name);
      }
    }

    return rval;
  }

  static fromDto(dto: CloudObjectEmbeddable) {
    return CloudObjectEmbeddable.merge(dto);
  }

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

  @Property({
    type: 'json',
    nullable: true,
  })
  prop?: EdgePropEmbeddable = new EdgePropEmbeddable();

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
