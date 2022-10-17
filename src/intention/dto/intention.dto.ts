import { ApiHideProperty } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ActionDto } from './action.dto';
import { actionFactory } from './action.util';
import { EventDto } from './event.dto';
import { TransactionDto } from './transaction.dto';
import { UserDto } from './user.dto';

export class IntentionDto {
  static plainToInstance(value: any): IntentionDto {
    const object = plainToInstance(IntentionDto, value);

    if (object.actions && Array.isArray(object.actions)) {
      object.actions = object.actions.map(actionFactory);
    }

    if (object.event) {
      object.event = plainToInstance(EventDto, object.event);
    }

    if (object.transaction) {
      object.transaction = plainToInstance(TransactionDto, object.transaction);
    }

    if (object.user) {
      object.user = plainToInstance(UserDto, object.user);
    }
    return object;
  }

  @ValidateNested()
  @IsDefined()
  @IsArray()
  actions: ActionDto[];

  @ValidateNested()
  @IsDefined()
  event: EventDto;

  @ValidateNested()
  @IsOptional()
  @ApiHideProperty()
  transaction?: TransactionDto;

  @ValidateNested()
  @IsDefined()
  user: UserDto;
}
