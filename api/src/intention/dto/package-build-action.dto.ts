import { Equals, IsIn } from 'class-validator';
import { ACTION_PROVISION_APPROLE_SECRET_ID } from './constants.dto';
import { ACTION_NAMES, ActionDto } from './action.dto';

export const PACKAGE_BUILD_PROVISION_NAMES = [
  ACTION_PROVISION_APPROLE_SECRET_ID,
];
export type PackageBuildProvisionName =
  (typeof PACKAGE_BUILD_PROVISION_NAMES)[number];

export class PackageBuildActionDto extends ActionDto {
  @Equals(ACTION_NAMES.PACKAGE_BUILD)
  override action!: ACTION_NAMES.PACKAGE_BUILD;

  @IsIn(PACKAGE_BUILD_PROVISION_NAMES, {
    each: true,
  })
  override provision!: PackageBuildProvisionName[];
}
