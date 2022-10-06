import { Equals, IsIn } from 'class-validator';
import { ActionDto } from './action.dto';

export class DatabaseAccessActionDto extends ActionDto {
  @Equals('database-access')
  action: 'database-access';

  @IsIn(['token/self'], {
    each: true,
  })
  provision: string[];
}
