import { Embeddable, Property } from '@mikro-orm/core';
import { ActionErrorDto } from '../dto/action-error.dto';

@Embeddable()
export class ActionErrorEmbeddable {
  constructor(
    message: string,
    action: string,
    actionId: string,
    key: string,
    value: string,
  ) {
    this.message = message;
    this.action = action;
    this.actionId = actionId;
    this.key = key;
    this.value = value;
  }

  static create(error: ActionErrorDto) {
    return new ActionErrorEmbeddable(
      error.message,
      error.data.action,
      error.data.action_id,
      error.data.key,
      error.data.value,
    );
  }

  @Property()
  message: string;

  @Property()
  action: string;

  @Property()
  actionId: string;

  @Property()
  key: string;

  @Property()
  value: string;
}
