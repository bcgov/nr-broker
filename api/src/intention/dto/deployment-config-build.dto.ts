import { Equals, IsIn } from 'class-validator';
import { ACTION_PROVISION_TOKEN_SELF } from './constants.dto';
import { ACTION_NAMES, ActionDto } from './action.dto';

export const DEPLOYMENT_CONFIG_BUILD_PROVISION_NAMES = [];
export type DeploymentConfigBuildProvisionName =
  (typeof DEPLOYMENT_CONFIG_BUILD_PROVISION_NAMES)[number];

export class DeploymentConfigBuildActionDto extends ActionDto {
  @Equals(ACTION_NAMES.DEPLOYMENT_CONFIG_BUILD)
  override action!: ACTION_NAMES.DEPLOYMENT_CONFIG_BUILD;

  @IsIn([ACTION_PROVISION_TOKEN_SELF], {
    each: true,
  })
  override provision!: DeploymentConfigBuildProvisionName[];
}
