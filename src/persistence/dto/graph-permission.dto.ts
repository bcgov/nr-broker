import { ApiHideProperty } from '@nestjs/swagger';
import { IsArray, IsDefined, IsString } from 'class-validator';
import { Column, ObjectIdColumn, ObjectId, Entity, Index } from 'typeorm';
import { UserPermissionRestDto } from './user-permission-rest.dto';
import { Type } from 'class-transformer';

@Entity({ name: 'graphPermission' })
export class GraphPermissionDto {
  @ObjectIdColumn()
  @ApiHideProperty()
  id: ObjectId;

  @Column()
  @IsString()
  @IsDefined()
  @Index()
  name: string;

  @Column()
  @IsArray()
  @IsDefined()
  @Type(() => UserPermissionRestDto)
  data: UserPermissionRestDto[];
}
