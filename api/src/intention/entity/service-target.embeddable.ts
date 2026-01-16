import { Embeddable, Enum, Property } from '@mikro-orm/core';
import { ENVIRONMENT_NAMES } from './action.embeddable';
import { ServiceTargetDto } from '../dto/service-target.dto';

@Embeddable()
export class ServiceTargetEmbeddable {
  constructor(environment: ENVIRONMENT_NAMES, name: string, project: string) {
    this.environment = environment;
    this.name = name;
    this.project = project;
  }

  static fromDto(target: ServiceTargetDto) {
    return new ServiceTargetEmbeddable(
      target.environment,
      target.name,
      target.project,
    );
  }

  @Enum({ items: () => ENVIRONMENT_NAMES })
  environment: ENVIRONMENT_NAMES;

  // Defaults to environment
  @Property({ nullable: true })
  instanceName?: string;

  @Property()
  name: string;

  @Property()
  project: string;
}
