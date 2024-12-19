import { Embeddable, Embedded, Enum, Property } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { ObjectId } from 'mongodb';
import { ServiceTargetEmbeddable } from './service-target.embeddable';
import { ENVIRONMENT_NAMES } from './action.embeddable';
import { IntentionServiceDto } from '../dto/intention-service.dto';

@Embeddable()
export class IntentionServiceEmbeddable {
  constructor(
    environment: ENVIRONMENT_NAMES,
    name: string,
    project: string,
    target?: ServiceTargetEmbeddable,
  ) {
    this.environment = environment;
    this.name = name;
    this.project = project;
    this.target = target;
  }

  static fromDto(service: IntentionServiceDto) {
    return new IntentionServiceEmbeddable(
      service.environment,
      service.name,
      service.project,
      service.target
        ? ServiceTargetEmbeddable.fromDto(service.target)
        : undefined,
    );
  }

  @Enum({ items: () => ENVIRONMENT_NAMES })
  environment: string;

  @Property()
  @ApiProperty({ type: () => String })
  id?: ObjectId;

  // Defaults to environment
  @Property({ nullable: true })
  instanceName?: string;

  @Property()
  name: string;

  @Property()
  project: string;

  @Embedded({
    entity: () => ServiceTargetEmbeddable,
    nullable: true,
    object: true,
  })
  target?: ServiceTargetEmbeddable;
}
