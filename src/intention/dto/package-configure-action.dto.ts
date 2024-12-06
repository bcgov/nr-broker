import { Equals, IsIn } from 'class-validator';
import { ACTION_PROVISION_TOKEN_SELF } from '../../constants';
import { ActionDto } from './action.dto';

export const PACKAGE_CONFIGURE_PROVISION_NAMES = [ACTION_PROVISION_TOKEN_SELF];
export type PackageConfigureProvisionName =
  (typeof PACKAGE_CONFIGURE_PROVISION_NAMES)[number];

export class PackageConfigureActionDto extends ActionDto {
  @Equals('package-configure')
  action: 'package-configure';

  @IsIn(PACKAGE_CONFIGURE_PROVISION_NAMES, {
    each: true,
  })
  provision: PackageConfigureProvisionName[];
}
