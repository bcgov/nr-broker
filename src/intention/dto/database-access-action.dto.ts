import { Equals, IsIn } from 'class-validator';
import { ACTION_PROVISION_TOKEN_SELF } from '../../constants';
import { Entity, Property } from '@mikro-orm/core';
import { ActionDto } from './action.dto';

@Entity()
export class DatabaseAccessActionDto extends ActionDto {
  @Equals('database-access')
  action: 'database-access';

  @IsIn([ACTION_PROVISION_TOKEN_SELF], {
    each: true,
  })
  @Property()
  provision: string[];
}
