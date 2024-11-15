import { ObjectId } from 'mongodb';
import { ApiProperty } from '@nestjs/swagger';
import { Embeddable, Property } from '@mikro-orm/core';
import { IntentionEntity } from '../../intention/dto/intention.entity';
import { ActionDto } from '../../intention/dto/action.dto';

@Embeddable()
export class IntentionActionPointerDto {
  @Property()
  action: string;

  @Property()
  @ApiProperty({ type: () => String })
  intention: ObjectId;

  // For returning joined intention
  source?: {
    intention: IntentionEntity;
    action: ActionDto;
  };
}
