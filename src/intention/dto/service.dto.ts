import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Entity, Column } from 'typeorm';
import { ServiceTargetDto } from './service-target.dto';
import { ApiProperty } from '@nestjs/swagger';
import { ObjectId } from 'mongodb';

@Entity()
export class ServiceDto {
  @IsString()
  @IsDefined()
  @Column()
  environment: string;

  @Column()
  @IsOptional()
  @ApiProperty({ type: () => String })
  @Transform((value) =>
    value.obj.id ? new ObjectId(value.obj.id.toString()) : null,
  )
  id?: ObjectId;

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
