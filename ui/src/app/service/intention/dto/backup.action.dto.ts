import { Equals, IsIn, ValidateIf } from 'class-validator';
import { ACTION_PROVISION_TOKEN_SELF } from './constants.dto';
import { ACTION_NAMES, ActionDto } from './action.dto';

export const BACKUP_PROVISION_NAMES = [ACTION_PROVISION_TOKEN_SELF];
export type BackupProvisionName = (typeof BACKUP_PROVISION_NAMES)[number];

export class BackupActionDto extends ActionDto {
  @Equals(ACTION_NAMES.BACKUP)
  override action!: ACTION_NAMES.BACKUP;

  @ValidateIf((o) => o.provision.length > 0)
  @IsIn(BACKUP_PROVISION_NAMES, {
    each: true,
  })
  override provision!: BackupProvisionName[];
}
