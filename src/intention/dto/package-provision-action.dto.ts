import { Equals, IsIn } from 'class-validator';
import { ACTION_PROVISION_APPROLE_SECRET_ID } from '../../constants';
import { ActionDto } from './action.dto';

export const PACKAGE_PROVISION_PROVISION_NAMES = [
  ACTION_PROVISION_APPROLE_SECRET_ID,
];
export type PackageProvisionProvisionName =
  (typeof PACKAGE_PROVISION_PROVISION_NAMES)[number];

export class PackageProvisionActionDto extends ActionDto {
  @Equals('package-provision')
  action: 'package-provision';

  @IsIn(PACKAGE_PROVISION_PROVISION_NAMES, {
    each: true,
  })
  provision: PackageProvisionProvisionName[];
}
