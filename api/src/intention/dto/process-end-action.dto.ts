import { Equals, IsIn } from 'class-validator';
import { ACTION_NAMES, ActionDto } from './action.dto';

export const PROCESS_END_PROVISION_NAMES = [];
export type ProcessEndProvisionName =
  (typeof PROCESS_END_PROVISION_NAMES)[number];

export class ProcessEndActionDto extends ActionDto {
  @Equals(ACTION_NAMES.PROCESS_END)
  override action!: ACTION_NAMES.PROCESS_END;

  @IsIn([], {
    each: true,
  })
  override provision!: ProcessEndProvisionName[];
}
