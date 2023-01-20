import { Equals, IsIn, ValidateIf } from 'class-validator';
import { ACTION_PROVISION_TOKEN_SELF } from '../../constants';
import { ActionDto } from './action.dto';

export class BackupActionDto extends ActionDto {
  @Equals('backup')
  action: 'backup';

  @ValidateIf((o) => o.provision.length > 0)
  @IsIn([ACTION_PROVISION_TOKEN_SELF], {
    each: true,
  })
  provision: string[];
}
