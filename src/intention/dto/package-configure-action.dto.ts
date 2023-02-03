import { Equals, IsIn } from 'class-validator';
import { Entity, Column } from 'typeorm';
import { ACTION_PROVISION_TOKEN_SELF } from '../../constants';
import { ActionDto } from './action.dto';

@Entity()
export class PackageConfigureActionDto extends ActionDto {
  @Equals('package-configure')
  action: 'package-configure';

  @IsIn([ACTION_PROVISION_TOKEN_SELF], {
    each: true,
  })
  @Column()
  provision: string[];
}
