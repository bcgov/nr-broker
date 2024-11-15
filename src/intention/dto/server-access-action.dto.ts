import { Equals, IsIn } from 'class-validator';
import { Entity, Property } from '@mikro-orm/core';
import { ACTION_PROVISION_TOKEN_SELF } from '../../constants';
import { ActionDto } from './action.dto';

@Entity()
export class ServerAccessActionDto extends ActionDto {
  @Equals('server-access')
  declare action: 'server-access';

  @IsIn([ACTION_PROVISION_TOKEN_SELF], {
    each: true,
  })
  @Property()
  declare provision: string[];
}
