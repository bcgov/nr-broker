import { Equals, IsIn } from 'class-validator';
import { ActionDto } from './action.dto';

export class PackageConfigureActionDto extends ActionDto {
  @Equals('package-configure')
  action: 'package-configure';

  @IsIn(['token/self'], {
    each: true,
  })
  provision: string[];
}
