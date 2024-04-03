import {
  IsDefined,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { EdgePropDto } from '../../persistence/dto/edge-prop.dto';
import { Type } from 'class-transformer';
import { Column } from 'typeorm';
import { CloudObjectDto } from './cloud-object.dto';

export class InstallDto {
  @IsDefined()
  @ValidateNested()
  @Column(() => CloudObjectDto)
  @Type(() => CloudObjectDto)
  cloudTarget: CloudObjectDto;

  @IsOptional()
  @IsObject()
  prop?: EdgePropDto;
}
