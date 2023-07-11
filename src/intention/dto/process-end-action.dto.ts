import { Equals, IsIn } from 'class-validator';
import { Entity, Column } from 'typeorm';
import { ActionDto } from './action.dto';

@Entity()
export class ProcessEndActionDto extends ActionDto {
  @Equals('process-end')
  action: 'process-end';

  @IsIn([], {
    each: true,
  })
  @Column()
  provision: string[];
}
