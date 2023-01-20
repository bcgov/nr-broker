import { Equals, IsIn } from 'class-validator';
import { ACTION_PROVISION_TOKEN_SELF } from '../../constants';
import { ActionDto } from './action.dto';

export class ServerAccessActionDto extends ActionDto {
  @Equals('server-access')
  action: 'server-access';

  @IsIn([ACTION_PROVISION_TOKEN_SELF], {
    each: true,
  })
  provision: string[];
}
