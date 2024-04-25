import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Entity, ObjectIdColumn, Column, Index } from 'typeorm';
import { IsDefined, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ObjectId } from 'mongodb';

import { PackageDto } from '../../intention/dto/package.dto';
import { TimestampDto } from './timestamp.dto';

@Entity({ name: 'packageBuild' })
export class PackageBuildDto {
  @ObjectIdColumn()
  @ApiHideProperty()
  id: ObjectId;

  @IsDefined()
  @Column()
  @ApiProperty({ type: () => String })
  @Transform((value) =>
    value.obj.vertex ? new ObjectId(value.obj.vertex.toString()) : null,
  )
  @Index()
  service: ObjectId;

  // @IsDefined()
  // @Column()
  // @Index()
  // name: string;

  @IsDefined()
  @Column()
  @Index()
  semvar: string;

  // @Column()
  // @IsOptional()
  // installed?: Date;

  @IsDefined()
  @ValidateNested()
  @Column(() => PackageDto)
  @Type(() => PackageDto)
  package: PackageDto;

  @IsDefined()
  @Column(() => TimestampDto)
  @Type(() => TimestampDto)
  timestamps: TimestampDto;
}
