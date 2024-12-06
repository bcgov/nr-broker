import { Equals, IsIn } from 'class-validator';
import { ACTION_PROVISION_TOKEN_SELF } from '../../constants';
import { ActionDto } from './action.dto';

export const SERVER_ACCESS_PROVISION_NAMES = [ACTION_PROVISION_TOKEN_SELF];
export type ServerAccessProvisionName =
  (typeof SERVER_ACCESS_PROVISION_NAMES)[number];

export class ServerAccessActionDto extends ActionDto {
  @Equals('server-access')
  declare action: 'server-access';

  @IsIn(SERVER_ACCESS_PROVISION_NAMES, {
    each: true,
  })
  declare provision: ServerAccessProvisionName[];
}
