import { Equals, IsIn } from 'class-validator';
import { Entity, Column } from 'typeorm';
import { ACTION_PROVISION_TOKEN_SELF } from '../../constants';
import { ActionDto } from './action.dto';

@Entity()
export class ServerAccessActionDto extends ActionDto {
  @Equals('server-access')
  declare action: 'server-access';

  @IsIn([ACTION_PROVISION_TOKEN_SELF], {
    each: true,
  })
  @Column()
  declare provision: string[];
}
