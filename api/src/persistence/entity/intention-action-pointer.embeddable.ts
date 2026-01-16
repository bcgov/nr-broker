import { ObjectId } from 'mongodb';
import { Embeddable, Property } from '@mikro-orm/core';
import { IntentionDto } from '../../intention/dto/intention.dto';
import { ActionDto } from '../../intention/dto/action.dto';

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
    intention: IntentionDto;
    action: ActionDto;
  };
}
