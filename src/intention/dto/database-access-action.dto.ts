import { Equals, IsIn } from 'class-validator';
import { ACTION_PROVISION_TOKEN_SELF } from '../../constants';
import { ActionDto } from './action.dto';

export const DATABASE_ACCESS_PROVISION_NAMES = [ACTION_PROVISION_TOKEN_SELF];
export type DatabaseAccessProvisionName =
  (typeof DATABASE_ACCESS_PROVISION_NAMES)[number];

export class DatabaseAccessActionDto extends ActionDto {
  @Equals('database-access')
  action: 'database-access';

  @IsIn([ACTION_PROVISION_TOKEN_SELF], {
    each: true,
  })
  provision: DatabaseAccessProvisionName[];
}
