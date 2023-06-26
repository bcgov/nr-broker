import { Equals, IsIn } from 'class-validator';
import { Entity, Column } from 'typeorm';
import { ACTION_PROVISION_APPROLE_SECRET_ID } from '../../constants';
import { ActionDto } from './action.dto';

@Entity()
export class PackageBuildActionDto extends ActionDto {
  @Equals('package-build')
  action: 'package-build';

  @IsIn([ACTION_PROVISION_APPROLE_SECRET_ID], {
    each: true,
  })
  @Column()
  provision: string[];
}
