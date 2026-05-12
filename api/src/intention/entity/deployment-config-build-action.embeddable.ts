import { Embeddable } from '@mikro-orm/decorators/legacy';

import {
  ACTION_NAMES,
  ActionEmbeddable,
  ENVIRONMENT_NAMES,
} from './action.embeddable';
import { UserEmbeddable } from './user.embeddable';
import { TransactionEmbeddable } from './transaction.embeddable';
import { IntentionServiceEmbeddable } from './intention-service.embeddable';
import { ActionDto } from '../dto/action.dto';
import { PackageEmbeddable } from './package.embeddable';

@Embeddable({ discriminatorValue: ACTION_NAMES.DEPLOYMENT_CONFIG_BUILD })
export class DeploymentConfigBuildActionEmbeddable extends ActionEmbeddable {
  constructor(
    action: ActionDto,
    actionUser: UserEmbeddable,
    service: IntentionServiceEmbeddable,
    vaultEnvironment: ENVIRONMENT_NAMES | undefined,
    trace: TransactionEmbeddable,
  ) {
    super(action, actionUser, service, vaultEnvironment, trace);
    this.action = ACTION_NAMES.DEPLOYMENT_CONFIG_BUILD;

    if (action.package) {
      this.package = PackageEmbeddable.merge(action.package);
    }
  }
}
