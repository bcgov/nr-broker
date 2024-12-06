import { ApiHideProperty } from '@nestjs/swagger';
import { Embeddable, Embedded, Enum, Property } from '@mikro-orm/core';

import { UserEmbeddable } from './user.embeddable';
import { IntentionServiceEmbeddable } from './intention-service.embeddable';
import { TransactionEmbeddable } from './transaction.embeddable';
import { CloudEmbeddable } from './cloud.embeddable';
import { PackageEmbeddable } from './package.embeddable';
import { UrlEmbeddable } from './url.embeddable';
import { ArtifactEmbeddable } from './artifact.embeddable';
import { ActionSourceEmbeddable } from './action-source.embeddable';
import { ActionDto } from '../dto/action.dto';

export enum ACTION_NAMES {
  BACKUP = 'backup',
  DATABASE_ACCESS = 'database-access',
  SERVER_ACCESS = 'server-access',
  PACKAGE_BUILD = 'package-build',
  PACKAGE_CONFIGURE = 'package-configure',
  PACKAGE_INSTALLATION = 'package-installation',
  PACKAGE_PROVISION = 'package-provision',
  PROCESS_END = 'process-end',
  PROCESS_START = 'process-start',
}

export enum ENVIRONMENT_NAMES {
  PRODUCTION = 'production',
  TEST = 'test',
  DEVELOPMENT = 'development',
  TOOLS = 'tools',
}

export enum LIFECYCLE_NAMES {
  STARTED = 'started',
  ENDED = 'ended',
}

@Embeddable({ abstract: true, discriminatorColumn: 'action' })
export abstract class ActionEmbeddable {
  constructor(
    action: ActionDto,
    actionUser: UserEmbeddable,
    service: IntentionServiceEmbeddable,
    vaultEnvironment: ENVIRONMENT_NAMES | undefined,
    trace: TransactionEmbeddable,
  ) {
    this.id = action.id;
    this.provision = action.provision;
    this.user = actionUser;
    this.trace = trace;
    this.vaultEnvironment = vaultEnvironment;
    this.service = service;
  }

  @Enum(() => ACTION_NAMES)
  action: ACTION_NAMES;

  @Property()
  id: string;

  @Embedded({ entity: () => ArtifactEmbeddable, array: true, nullable: true })
  artifacts?: ArtifactEmbeddable[];

  @Property()
  provision: Array<any>;

  @Embedded({ entity: () => CloudEmbeddable, nullable: true, object: true })
  cloud?: CloudEmbeddable;

  @Embedded({
    entity: () => IntentionServiceEmbeddable,
    nullable: true,
    object: true,
  })
  service: IntentionServiceEmbeddable;

  @Enum({ items: () => LIFECYCLE_NAMES, nullable: true })
  lifecycle?: LIFECYCLE_NAMES;

  @Embedded({ entity: () => PackageEmbeddable, nullable: true, object: true })
  package?: PackageEmbeddable;

  @Embedded({
    entity: () => ActionSourceEmbeddable,
    nullable: true,
    object: true,
  })
  source?: ActionSourceEmbeddable;

  // @ApiHideProperty()
  // @Embedded({ entity: () => TransactionEmbeddable })
  // transaction: TransactionEmbeddable;

  @ApiHideProperty()
  @Embedded({ entity: () => TransactionEmbeddable })
  trace: TransactionEmbeddable;

  @Embedded({ entity: () => UrlEmbeddable, nullable: true, object: true })
  url?: UrlEmbeddable;

  @Embedded({ entity: () => UserEmbeddable, object: true })
  user: UserEmbeddable;

  @Property({ nullable: true })
  valid?: boolean;

  @Enum({ items: () => ENVIRONMENT_NAMES, nullable: true })
  vaultEnvironment?: ENVIRONMENT_NAMES | undefined;

  @Enum({ items: () => ENVIRONMENT_NAMES, nullable: true })
  vaultInstance?: ENVIRONMENT_NAMES | undefined;
}
