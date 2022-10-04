import { Equals, IsIn } from 'class-validator';
import { ActionDto } from './action.dto';

export class ServerAccessActionDto extends ActionDto {
  @Equals('server-access')
  action: 'server-access';

  @IsIn(['token/self'], {
    each: true,
  })
  provision: string[];
}
