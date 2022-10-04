import { Equals, IsIn } from 'class-validator';
import { ActionDto } from './action.dto';

export class PackageInstallationActionDto extends ActionDto {
  @Equals('package-installation')
  action: 'package-installation';

  @IsIn([], {
    each: true,
  })
  provision: string[];
}
