import { Equals, IsIn } from 'class-validator';
import { ACTION_PROVISION_APPROLE_SECRET_ID } from './constants.dto';
import { ACTION_NAMES, ActionDto } from './action.dto';

export const PACKAGE_PROVISION_PROVISION_NAMES = [
  ACTION_PROVISION_APPROLE_SECRET_ID,
];
export type PackageProvisionProvisionName =
  (typeof PACKAGE_PROVISION_PROVISION_NAMES)[number];

export class PackageProvisionActionDto extends ActionDto {
  @Equals(ACTION_NAMES.PACKAGE_PROVISION)
  override action!: ACTION_NAMES.PACKAGE_PROVISION;

  @IsIn(PACKAGE_PROVISION_PROVISION_NAMES, {
    each: true,
  })
  override provision!: PackageProvisionProvisionName[];
}
