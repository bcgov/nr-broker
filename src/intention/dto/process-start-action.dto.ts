import { Equals, IsIn } from 'class-validator';
import { ActionDto } from './action.dto';

export const PROCESS_START_PROVISION_NAMES = [];
export type ProcessStartProvisionName =
  (typeof PROCESS_START_PROVISION_NAMES)[number];

export class ProcessStartActionDto extends ActionDto {
  @Equals('process-start')
  action: 'process-start';

  @IsIn([], {
    each: true,
  })
  provision: ProcessStartProvisionName[];
}
