import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import { EdgePropDto } from '../../persistence/dto/edge-prop.dto';
import { Type } from 'class-transformer';
import { CloudObjectDto } from './cloud-object.dto';
import { Property } from '@mikro-orm/core';

export class InstallDto {
  @IsOptional()
  @ValidateNested()
  @Property()
  @Type(() => CloudObjectDto)
  cloudTarget?: CloudObjectDto;

  @IsOptional()
  @IsObject()
  prop?: EdgePropDto;
}
