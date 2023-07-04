import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Entity, ObjectIdColumn, Column, Index } from 'typeorm';
import { ObjectId } from 'mongodb';
import { ActionDto } from './action.dto';
import { actionFactory } from './action.util';
import { BrokerJwtDto } from '../../auth/broker-jwt.dto';
import { EventDto } from './event.dto';
import { TransactionDto } from './transaction.dto';
import { UserDto } from './user.dto';

@Entity({ name: 'intention' })
export class IntentionDto {
  static plainToInstance(value: any): IntentionDto {
    const object = plainToInstance(IntentionDto, value);

    if (object.actions && Array.isArray(object.actions)) {
      object.actions = object.actions.map(actionFactory);
    }

    if (object.event) {
      object.event = plainToInstance(EventDto, object.event);
    }

    if (object.jwt) {
      object.jwt = plainToInstance(BrokerJwtDto, object.jwt);
    }

    if (object.transaction) {
      object.transaction = plainToInstance(TransactionDto, object.transaction);
    }

    if (object.user) {
      object.user = plainToInstance(UserDto, object.user);
    }
    return object;
  }

  static projectAction(
    intention: IntentionDto,
    token: string,
  ): ActionDto | null {
    if (intention) {
      // project the matching ActionDto
      return intention.actions.find((action) => action.trace.token === token);
    }
    return null;
  }

  @ObjectIdColumn()
  @ApiProperty({ type: () => String })
  id: ObjectId;

  @Column()
  @ApiProperty({ type: () => String })
  accountId?: ObjectId;

  @ValidateNested()
  @IsDefined()
  @IsArray()
  @Column(() => ActionDto)
  actions: ActionDto[];

  @ValidateNested()
  @IsDefined()
  @Column(() => EventDto)
  event: EventDto;

  @ValidateNested()
  @IsOptional()
  @ApiHideProperty()
  @Column(() => BrokerJwtDto)
  jwt?: BrokerJwtDto;

  @ValidateNested()
  @IsOptional()
  @ApiHideProperty()
  @Column(() => TransactionDto)
  transaction?: TransactionDto;

  @ValidateNested()
  @IsDefined()
  @Column(() => UserDto)
  user: UserDto;

  @IsOptional()
  @IsNumber()
  @ApiHideProperty()
  @Column()
  @Index()
  expiry?: number;

  @IsOptional()
  @IsBoolean()
  @ApiHideProperty()
  @Column()
  @Index()
  closed?: boolean;

  @Column()
  @ApiProperty()
  requireRoleId?: boolean;
}
