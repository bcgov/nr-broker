import { Equals, IsIn } from 'class-validator';
import { ActionDto } from './action.dto';

export class PackageProvisionActionDto extends ActionDto {
  @Equals('package-provision')
  action: 'package-provision';

  @IsIn(['approle/secret-id'], {
    each: true,
  })
  provision: string[];
}
