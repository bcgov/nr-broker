import { Equals, IsIn } from 'class-validator';
import { ACTION_PROVISION_TOKEN_SELF } from './constants.dto';
import { ACTION_NAMES, ActionDto } from './action.dto';

export const PACKAGE_CONFIGURE_PROVISION_NAMES = [ACTION_PROVISION_TOKEN_SELF];
export type PackageConfigureProvisionName =
  (typeof PACKAGE_CONFIGURE_PROVISION_NAMES)[number];

export class PackageConfigureActionDto extends ActionDto {
  @Equals(ACTION_NAMES.PACKAGE_CONFIGURE)
  override action!: ACTION_NAMES.PACKAGE_CONFIGURE;

  @IsIn(PACKAGE_CONFIGURE_PROVISION_NAMES, {
    each: true,
  })
  override provision!: PackageConfigureProvisionName[];
}
