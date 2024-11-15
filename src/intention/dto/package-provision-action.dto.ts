import { Equals, IsIn } from 'class-validator';
import { Entity, Property } from '@mikro-orm/core';
import { ACTION_PROVISION_APPROLE_SECRET_ID } from '../../constants';
import { ActionDto } from './action.dto';

@Entity()
export class PackageProvisionActionDto extends ActionDto {
  @Equals('package-provision')
  action: 'package-provision';

  @IsIn([ACTION_PROVISION_APPROLE_SECRET_ID], {
    each: true,
  })
  @Property()
  provision: string[];
}
