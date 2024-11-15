import { Equals, IsIn } from 'class-validator';
import { Entity, Property } from '@mikro-orm/core';
import { ActionDto } from './action.dto';

@Entity()
export class ProcessStartActionDto extends ActionDto {
  @Equals('process-start')
  action: 'process-start';

  @IsIn([], {
    each: true,
  })
  @Property()
  provision: string[];
}
