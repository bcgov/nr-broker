import { Equals, IsIn } from 'class-validator';
import { ACTION_PROVISION_TOKEN_SELF } from './constants.dto';
import { ACTION_NAMES, ActionDto } from './action.dto';

export const SERVER_ACCESS_PROVISION_NAMES = [ACTION_PROVISION_TOKEN_SELF];
export type ServerAccessProvisionName =
  (typeof SERVER_ACCESS_PROVISION_NAMES)[number];

export class ServerAccessActionDto extends ActionDto {
  @Equals(ACTION_NAMES.SERVER_ACCESS)
  override action!: ACTION_NAMES.SERVER_ACCESS;

  @IsIn(SERVER_ACCESS_PROVISION_NAMES, {
    each: true,
  })
  override provision!: ServerAccessProvisionName[];
}
