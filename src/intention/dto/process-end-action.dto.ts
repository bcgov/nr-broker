import { Equals, IsIn } from 'class-validator';
import { Entity, Property } from '@mikro-orm/core';
import { ActionDto } from './action.dto';

@Entity()
export class ProcessEndActionDto extends ActionDto {
  @Equals('process-end')
  action: 'process-end';

  @IsIn([], {
    each: true,
  })
  @Property()
  provision: string[];
}
