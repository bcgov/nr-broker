import { Equals, IsIn } from 'class-validator';
import { ActionDto } from './action.dto';

export const PACKAGE_INSTALLATION_PROVISION_NAMES = [];
export type PackageInstallationProvisionName =
  (typeof PACKAGE_INSTALLATION_PROVISION_NAMES)[number];

export class PackageInstallationActionDto extends ActionDto {
  @Equals('package-installation')
  action: 'package-installation';

  @IsIn(PACKAGE_INSTALLATION_PROVISION_NAMES, {
    each: true,
  })
  provision: PackageInstallationProvisionName[];
}
