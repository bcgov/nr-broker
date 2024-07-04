import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Entity, ObjectIdColumn, Column, Index } from 'typeorm';
import { IsDefined, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ObjectId } from 'mongodb';

import { PackageDto } from '../../intention/dto/package.dto';
import { TimestampDto } from './timestamp.dto';
import { IntentionActionPointerDto } from './intention-action-pointer.dto';

@Entity()
export class PackageBuildApprovalDto {
  @IsDefined()
  @Column()
  @ApiProperty({ type: () => String })
  @Transform((value) =>
    value.obj.environment
      ? new ObjectId(value.obj.environment.toString())
      : null,
  )
  environment: ObjectId;

  @IsDefined()
  @Column()
  @ApiProperty({ type: () => String })
  @Transform((value) =>
    value.obj.userId ? new ObjectId(value.obj.userId.toString()) : null,
  )
  user: ObjectId;

  @IsDefined()
  @Column()
  at: Date;
}

@Entity({ name: 'packageBuild' })
export class PackageBuildDto {
  @ObjectIdColumn()
  @ApiHideProperty()
  @Transform((value) =>
    value.obj.id ? new ObjectId(value.obj.id.toString()) : null,
  )
  id: ObjectId;

  @IsDefined()
  @Column(() => PackageBuildApprovalDto)
  @Type(() => PackageBuildApprovalDto)
  approval: PackageBuildApprovalDto[];

  @IsDefined()
  @Column(() => IntentionActionPointerDto, { array: true })
  @Type(() => IntentionActionPointerDto)
  installed: IntentionActionPointerDto[];

  @IsDefined()
  @Column()
  @ApiProperty({ type: () => String })
  @Transform((value) =>
    value.obj.vertex ? new ObjectId(value.obj.vertex.toString()) : null,
  )
  @Index()
  service: ObjectId;

  @IsDefined()
  @Column()
  @Index()
  semvar: string;

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
