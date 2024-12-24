import { Equals, IsIn } from 'class-validator';
import { ACTION_NAMES, ActionDto } from './action.dto';

export const PROCESS_START_PROVISION_NAMES = [];
export type ProcessStartProvisionName =
  (typeof PROCESS_START_PROVISION_NAMES)[number];

export class ProcessStartActionDto extends ActionDto {
  @Equals(ACTION_NAMES.PROCESS_START)
  override action!: ACTION_NAMES.PROCESS_START;

  @IsIn([], {
    each: true,
  })
  override provision!: ProcessStartProvisionName[];
}
