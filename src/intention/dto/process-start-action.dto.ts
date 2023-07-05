import { Equals, IsIn } from 'class-validator';
import { Entity, Column } from 'typeorm';
import { ActionDto } from './action.dto';

@Entity()
export class ProcessStartActionDto extends ActionDto {
  @Equals('process-start')
  action: 'process-start';

  @IsIn([], {
    each: true,
  })
  @Column()
  provision: string[];
}
