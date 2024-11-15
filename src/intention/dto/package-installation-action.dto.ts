import { Equals, IsIn } from 'class-validator';
import { Entity, Property } from '@mikro-orm/core';
import { ActionDto } from './action.dto';

@Entity()
export class PackageInstallationActionDto extends ActionDto {
  @Equals('package-installation')
  action: 'package-installation';

  @IsIn([], {
    each: true,
  })
  @Property()
  provision: string[];
}
