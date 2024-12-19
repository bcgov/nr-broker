import { Equals, IsIn, ValidateIf } from 'class-validator';
import { ACTION_PROVISION_TOKEN_SELF } from '../../constants';
import { ActionDto } from './action.dto';

export const BACKUP_PROVISION_NAMES = [ACTION_PROVISION_TOKEN_SELF];
export type BackupProvisionName = (typeof BACKUP_PROVISION_NAMES)[number];

export class BackupActionDto extends ActionDto {
  @Equals('backup')
  action: 'backup';

  @ValidateIf((o) => o.provision.length > 0)
  @IsIn(BACKUP_PROVISION_NAMES, {
    each: true,
  })
  provision: BackupProvisionName[];
}
