import { Equals, IsIn } from 'class-validator';
import { ACTION_PROVISION_TOKEN_SELF } from '../../constants';
import { ActionDto } from './action.dto';

export class DatabaseAccessActionDto extends ActionDto {
  @Equals('database-access')
  action: 'database-access';

  @IsIn([ACTION_PROVISION_TOKEN_SELF], {
    each: true,
  })
  provision: string[];
}
