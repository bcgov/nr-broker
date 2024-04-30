import { Type } from 'class-transformer';
import { IsDefined, IsOptional, ValidateNested } from 'class-validator';
import { Entity, Column } from 'typeorm';

import { CloudObjectDto } from './cloud-object.dto';

@Entity()
export class CloudDto {
  @ValidateNested()
  @IsOptional()
  @Column(() => CloudObjectDto)
  @Type(() => CloudObjectDto)
  source?: CloudObjectDto;

  @IsDefined()
  @ValidateNested()
  @Column(() => CloudObjectDto)
  @Type(() => CloudObjectDto)
  target: CloudObjectDto;
}
