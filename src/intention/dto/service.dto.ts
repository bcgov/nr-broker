import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { Entity, Property } from '@mikro-orm/core';
import { ServiceTargetDto } from './service-target.dto';
import { ApiProperty } from '@nestjs/swagger';
import { ObjectId } from 'mongodb';

@Entity()
export class ServiceDto {
  @IsString()
  @IsDefined()
  @Property()
  environment: string;

  @Property()
  @IsOptional()
  @ApiProperty({ type: () => String })
  @Transform((value) =>
    value.obj.id ? new ObjectId(value.obj.id.toString()) : null,
  )
  id?: ObjectId;

  // Defaults to environment
  @IsString()
  @IsOptional()
  @Property()
  instanceName?: string;

  @IsString()
  @IsDefined()
  @Property()
  @Length(1)
  name: string;

  @IsString()
  @IsDefined()
  @Property()
  @Length(1)
  project: string;

  @ValidateNested()
  @IsOptional()
  @Property()
  @Type(() => ServiceTargetDto)
  target?: ServiceTargetDto;
}
