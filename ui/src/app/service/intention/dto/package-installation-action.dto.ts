import { Equals, IsIn } from 'class-validator';
import { ACTION_NAMES, ActionDto } from './action.dto';

export const PACKAGE_INSTALLATION_PROVISION_NAMES = [];
export type PackageInstallationProvisionName =
  (typeof PACKAGE_INSTALLATION_PROVISION_NAMES)[number];

export class PackageInstallationActionDto extends ActionDto {
  @Equals(ACTION_NAMES.PACKAGE_INSTALLATION)
  override action!: ACTION_NAMES.PACKAGE_INSTALLATION;

  @IsIn(PACKAGE_INSTALLATION_PROVISION_NAMES, {
    each: true,
  })
  override provision!: PackageInstallationProvisionName[];
}
