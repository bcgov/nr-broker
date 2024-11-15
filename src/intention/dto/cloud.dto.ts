import { Type } from 'class-transformer';
import { IsDefined, IsOptional, ValidateNested } from 'class-validator';
import { Entity, Property } from '@mikro-orm/core';

import { CloudObjectDto } from './cloud-object.dto';

@Entity()
export class CloudDto {
  @ValidateNested()
  @IsOptional()
  @Property()
  @Type(() => CloudObjectDto)
  source?: CloudObjectDto;

  @IsDefined()
  @ValidateNested()
  @Property()
  @Type(() => CloudObjectDto)
  target: CloudObjectDto;
}
