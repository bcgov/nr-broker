import { Equals, IsIn } from 'class-validator';
import { ACTION_PROVISION_TOKEN_SELF } from './constants.dto';
import { ACTION_NAMES, ActionDto } from './action.dto';

export const DATABASE_ACCESS_PROVISION_NAMES = [ACTION_PROVISION_TOKEN_SELF];
export type DatabaseAccessProvisionName =
  (typeof DATABASE_ACCESS_PROVISION_NAMES)[number];

export class DatabaseAccessActionDto extends ActionDto {
  @Equals(ACTION_NAMES.DATABASE_ACCESS)
  override action!: ACTION_NAMES.DATABASE_ACCESS;

  @IsIn([ACTION_PROVISION_TOKEN_SELF], {
    each: true,
  })
  override provision!: DatabaseAccessProvisionName[];
}
