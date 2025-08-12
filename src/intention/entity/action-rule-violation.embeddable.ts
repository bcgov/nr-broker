import { Embeddable, Property } from '@mikro-orm/core';
import { ActionRuleViolationDto } from '../dto/action-rule-violation.dto';

@Embeddable()
export class ActionRuleViolationEmbeddable {
  constructor(message: string, key: string) {
    this.message = message;
    this.key = key;
  }

  static create(error: ActionRuleViolationDto) {
    return new ActionRuleViolationEmbeddable(error.message, error.key);
  }

  @Property()
  message: string;

  @Property()
  key: string;
}
