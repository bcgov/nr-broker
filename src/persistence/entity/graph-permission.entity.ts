import { ApiHideProperty } from '@nestjs/swagger';
import {
  Entity,
  Index,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { UserPermissionDto } from '../dto/user-permission.dto';
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
  @Index()
  name: string;

  @Property()
  @Type(() => UserPermissionDto)
  data: UserPermissionDto[];
}
