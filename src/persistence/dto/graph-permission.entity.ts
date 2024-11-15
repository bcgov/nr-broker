import { ApiHideProperty } from '@nestjs/swagger';
import { IsArray, IsDefined, IsString } from 'class-validator';
import {
  Entity,
  Index,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { UserPermissionRestDto } from './user-permission-rest.dto';
import { Transform, Type } from 'class-transformer';

@Entity({ tableName: 'graphPermission' })
export class GraphPermissionEntity {
  @ApiHideProperty()
  @Transform((value) =>
    value.obj.id ? new ObjectId(value.obj.id.toString()) : null,
  )
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  @IsString()
  @IsDefined()
  @Index()
  name: string;

  @Property()
  @IsArray()
  @IsDefined()
  @Type(() => UserPermissionRestDto)
  data: UserPermissionRestDto[];
}
