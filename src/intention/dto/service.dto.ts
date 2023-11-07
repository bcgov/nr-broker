import { Type } from 'class-transformer';
import {
  IsDefined,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Entity, Column } from 'typeorm';
import { ServiceTargetDto } from './service-target.dto';

@Entity()
export class ServiceDto {
  @IsString()
  @IsDefined()
  @Column()
  environment: string;

  // Defaults to environment
  @IsString()
  @IsOptional()
  @Column()
  instanceName?: string;

  @IsString()
  @IsDefined()
  @Column()
  name: string;

  @IsString()
  @IsDefined()
  @Column()
  project: string;

  @ValidateNested()
  @IsOptional()
  @Column(() => ServiceTargetDto)
  @Type(() => ServiceTargetDto)
  target?: ServiceTargetDto;
}
