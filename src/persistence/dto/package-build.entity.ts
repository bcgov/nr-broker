import {
  Embedded,
  Entity,
  Index,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDefined, ValidateNested } from 'class-validator';

import { PackageDto } from '../../intention/dto/package.dto';
import { TimestampDto } from './timestamp.dto';
import { IntentionActionPointerDto } from './intention-action-pointer.dto';

@Entity()
export class PackageBuildApprovalEntity {
  @IsDefined()
  @ApiProperty({ type: () => String })
  @Transform((value) =>
    value.obj.environment
      ? new ObjectId(value.obj.environment.toString())
      : null,
  )
  environment: ObjectId;

  @IsDefined()
  @ApiProperty({ type: () => String })
  @Transform((value) =>
    value.obj.user ? new ObjectId(value.obj.user.toString()) : null,
  )
  @Property()
  user: ObjectId;

  @IsDefined()
  @Property()
  at: Date;
}

@Entity({ tableName: 'packageBuild' })
export class PackageBuildEntity {
  @ApiHideProperty()
  @Transform((value) =>
    value.obj.id ? new ObjectId(value.obj.id.toString()) : null,
  )
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @IsDefined()
  @Type(() => PackageBuildApprovalEntity)
  @Property()
  approval: PackageBuildApprovalEntity[];

  @Embedded(() => IntentionActionPointerDto, { array: true })
  installed: IntentionActionPointerDto[];

  @Embedded({ entity: () => IntentionActionPointerDto, nullable: true })
  source: IntentionActionPointerDto;

  @IsDefined()
  @ApiProperty({ type: () => String })
  @Index()
  @Property()
  service: ObjectId;

  @Property()
  name: string;

  @Index()
  @Property()
  semvar: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => PackageDto)
  @Property()
  package: PackageDto;

  @Embedded({ entity: () => TimestampDto })
  timestamps: TimestampDto;
}
