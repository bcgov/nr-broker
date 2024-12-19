import { Equals, IsIn } from 'class-validator';
import { ActionDto } from './action.dto';

export const PROCESS_END_PROVISION_NAMES = [];
export type ProcessEndProvisionName =
  (typeof PROCESS_END_PROVISION_NAMES)[number];

export class ProcessEndActionDto extends ActionDto {
  @Equals('process-end')
  action: 'process-end';

  @IsIn([], {
    each: true,
  })
  provision: ProcessEndProvisionName[];
}
