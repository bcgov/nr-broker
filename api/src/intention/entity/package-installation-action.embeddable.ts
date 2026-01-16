import { Embeddable, Embedded } from '@mikro-orm/core';
import {
  ACTION_NAMES,
  ActionEmbeddable,
  ENVIRONMENT_NAMES,
} from './action.embeddable';
import { IntentionServiceEmbeddable } from './intention-service.embeddable';
import { TransactionEmbeddable } from './transaction.embeddable';
import { UserEmbeddable } from './user.embeddable';
import { PackageEmbeddable } from './package.embeddable';
import { ActionDto } from '../dto/action.dto';
import { ActionSourceEmbeddable } from './action-source.embeddable';

@Embeddable({ discriminatorValue: ACTION_NAMES.PACKAGE_INSTALLATION })
export class PackageInstallationActionEmbeddable extends ActionEmbeddable {
  constructor(
    action: ActionDto,
    actionUser: UserEmbeddable,
    service: IntentionServiceEmbeddable,
    vaultEnvironment: ENVIRONMENT_NAMES | undefined,
    trace: TransactionEmbeddable,
    packageEmbed: PackageEmbeddable,
    source: ActionSourceEmbeddable,
  ) {
    super(action, actionUser, service, vaultEnvironment, trace);
    this.action = ACTION_NAMES.PACKAGE_INSTALLATION;
    this.package = packageEmbed;
    this.source = source;
  }

  @Embedded({ entity: () => PackageEmbeddable, object: true })
  package: PackageEmbeddable;
}
