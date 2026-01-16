import { Embeddable, Property } from '@mikro-orm/core';
import {
  ACTION_NAMES,
  ActionEmbeddable,
  ENVIRONMENT_NAMES,
} from './action.embeddable';
import { IntentionServiceEmbeddable } from './intention-service.embeddable';
import { TransactionEmbeddable } from './transaction.embeddable';
import { UserEmbeddable } from './user.embeddable';
import { PackageBuildProvisionName } from '../dto/package-build-action.dto';
import { ActionDto } from '../dto/action.dto';
import { PackageEmbeddable } from './package.embeddable';

@Embeddable({ discriminatorValue: ACTION_NAMES.PACKAGE_BUILD })
export class PackageBuildActionEmbeddable extends ActionEmbeddable {
  constructor(
    action: ActionDto,
    actionUser: UserEmbeddable,
    service: IntentionServiceEmbeddable,
    vaultEnvironment: ENVIRONMENT_NAMES | undefined,
    trace: TransactionEmbeddable,
  ) {
    super(action, actionUser, service, vaultEnvironment, trace);

    this.action = ACTION_NAMES.PACKAGE_BUILD;
    this.provision = action.provision;
    if (action.package) {
      this.package = PackageEmbeddable.merge(action.package);
    }
  }

  @Property()
  provision: PackageBuildProvisionName[];
}
