import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ObjectId } from 'mongodb';
import { ServiceTargetDto } from './service-target.dto';
import { ENVIRONMENT_NAMES } from '../entity/action.embeddable';

export class IntentionServiceDto {
  @IsString()
  @IsDefined()
  environment: ENVIRONMENT_NAMES;

  @IsOptional()
  @ApiProperty({ type: () => String })
  @Transform((value) =>
    value.obj.id ? new ObjectId(value.obj.id.toString()) : null,
  )
  id?: ObjectId;

  // Defaults to environment
  @IsString()
  @IsOptional()
  instanceName?: string;

  @IsString()
  @IsDefined()
  @Length(1)
  name: string;

  @IsString()
  @IsDefined()
  @Length(1)
  project: string;

  @ValidateNested()
  @IsOptional()
  @Type(() => ServiceTargetDto)
  target?: ServiceTargetDto;
}
