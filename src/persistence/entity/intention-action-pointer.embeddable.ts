import { ObjectId } from 'mongodb';
import { Embeddable, Property } from '@mikro-orm/core';
import { IntentionEntity } from '../../intention/entity/intention.entity';
import { ActionEmbeddable } from '../../intention/entity/action.embeddable';

@Embeddable()
export class IntentionActionPointerEmbeddable {
  @Property()
  action: string;

  @Property()
  intention: ObjectId;

  constructor(action: string, intention: ObjectId) {
    this.action = action;
    this.intention = intention;
  }

  // For returning joined intention
  source?: {
    intention: IntentionEntity;
    action: ActionEmbeddable;
  };
}
