import { Embeddable } from '@mikro-orm/core';
import {
  ACTION_NAMES,
  ActionEmbeddable,
  ENVIRONMENT_NAMES,
} from './action.embeddable';
import { IntentionServiceEmbeddable } from './intention-service.embeddable';
import { TransactionEmbeddable } from './transaction.embeddable';
import { UserEmbeddable } from './user.embeddable';
import { ActionDto } from '../dto/action.dto';

@Embeddable({ discriminatorValue: ACTION_NAMES.SERVER_ACCESS })
export class ServerAccessActionEmbeddable extends ActionEmbeddable {
  constructor(
    action: ActionDto,
    actionUser: UserEmbeddable,
    service: IntentionServiceEmbeddable,
    vaultEnvironment: ENVIRONMENT_NAMES | undefined,
    trace: TransactionEmbeddable,
  ) {
    super(action, actionUser, service, vaultEnvironment, trace);
    this.action = ACTION_NAMES.SERVER_ACCESS;
  }
}
