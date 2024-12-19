import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

import { CloudDto } from './cloud.dto';
import { PackageDto } from './package.dto';

export class ActionPatchRestDto {
  @ValidateNested()
  @IsOptional()
  @Type(() => CloudDto)
  cloud?: CloudDto;

  @ValidateNested()
  @IsOptional()
  @Type(() => PackageDto)
  package?: PackageDto;
}
