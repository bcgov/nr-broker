import { Equals, IsIn } from 'class-validator';
import { Entity, Column } from 'typeorm';
import { ACTION_PROVISION_TOKEN_SELF } from '../../constants';
import { ActionDto } from './action.dto';

@Entity()
export class DatabaseAccessActionDto extends ActionDto {
  @Equals('database-access')
  action: 'database-access';

  @IsIn([ACTION_PROVISION_TOKEN_SELF], {
    each: true,
  })
  @Column()
  provision: string[];
}
