import { Injectable } from '@nestjs/common';
import { ActionEmbeddable } from './entity/action.embeddable';
import { IntentionEntity } from './entity/intention.entity';
import { BrokerAccountProjectMapDto } from '../persistence/dto/graph-data.dto';
import { BrokerAccountEntity } from '../persistence/entity/broker-account.entity';
import { UserCollectionService } from '../collection/user-collection.service';
import { ValidationRuleEngine } from './validation/validation-rule.engine';
import { DecisionContext } from './validation/decision-context.interface';

/**
 * Assists with the validation of intention actions
 */
@Injectable()
export class ActionService {
  constructor(
    private readonly userCollectionService: UserCollectionService,
    private readonly validationRuleEngine: ValidationRuleEngine,
  ) {}

  public async validate(
    intention: IntentionEntity,
    action: ActionEmbeddable,
    account: BrokerAccountEntity | null,
    accountBoundProjects: BrokerAccountProjectMapDto | null,
    targetServices: string[],
    requireProjectExists: boolean,
    requireServiceExists: boolean,
  ): Promise<void> | null {
    const user = await this.userCollectionService.lookupUserByGuid(
      action.user.id,
    );

    // Build decision context (DMN-compatible facts)
    const decisionContext: DecisionContext = {
      intention,
      action,
      account,
      accountBoundProjects,
      user,
      targetServices,
      requireProjectExists,
      requireServiceExists,
    };

    // Execute validation rules via rule engine
    const ruleViolation =
      await this.validationRuleEngine.validate(decisionContext);

    if (ruleViolation) {
      action.ruleViolation = ruleViolation;
      action.trace.outcome = 'rejected';
    }
  }
}
