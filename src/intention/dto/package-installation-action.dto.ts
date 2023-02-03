import { Equals, IsIn } from 'class-validator';
import { Entity, Column } from 'typeorm';
import { ActionDto } from './action.dto';

@Entity()
export class PackageInstallationActionDto extends ActionDto {
  @Equals('package-installation')
  action: 'package-installation';

  @IsIn([], {
    each: true,
  })
  @Column()
  provision: string[];
}
