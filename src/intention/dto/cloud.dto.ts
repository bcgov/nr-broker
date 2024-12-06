import { Type } from 'class-transformer';
import { IsDefined, IsOptional, ValidateNested } from 'class-validator';

import { CloudObjectDto } from './cloud-object.dto';

export class CloudDto {
  @ValidateNested()
  @IsOptional()
  @Type(() => CloudObjectDto)
  source?: CloudObjectDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => CloudObjectDto)
  target: CloudObjectDto;
}
