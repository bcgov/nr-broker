import { ApiHideProperty } from '@nestjs/swagger';
import { Entity, ObjectIdColumn, ObjectId, Column } from 'typeorm';
import { VertexPointerDto } from './vertex-pointer.dto';
import { IsOptional } from 'class-validator';

export class UserGroupDto {
  @Column()
  domain?: string;

  @Column()
  id?: string;

  @Column()
  name?: string;
}

@Entity({ name: 'user' })
export class UserDto extends VertexPointerDto {
  @ObjectIdColumn()
  @ApiHideProperty()
  id: ObjectId;

  @Column()
  domain: string;

  @Column()
  email: string;

  @Column(() => UserGroupDto)
  @IsOptional()
  group?: UserGroupDto;

  @Column()
  guid: string;

  @Column()
  name: string;

  @Column()
  username: string;
}
