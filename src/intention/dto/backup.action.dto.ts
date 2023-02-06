import { Equals, IsIn, ValidateIf } from 'class-validator';
import { Entity, Column } from 'typeorm';
import { ACTION_PROVISION_TOKEN_SELF } from '../../constants';
import { ActionDto } from './action.dto';

@Entity()
export class BackupActionDto extends ActionDto {
  @Equals('backup')
  action: 'backup';

  @ValidateIf((o) => o.provision.length > 0)
  @IsIn([ACTION_PROVISION_TOKEN_SELF], {
    each: true,
  })
  @Column()
  provision: string[];
}
