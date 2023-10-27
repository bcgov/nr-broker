import { ApiHideProperty } from '@nestjs/swagger';
import { Entity, ObjectIdColumn, ObjectId, Column } from 'typeorm';
import { IsDefined, IsOptional, IsString } from 'class-validator';
import { VertexPointerDto } from './vertex-pointer.dto';

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

  @IsDefined()
  @IsString()
  @Column()
  domain: string;

  @IsDefined()
  @IsString()
  @Column()
  email: string;

  @Column(() => UserGroupDto)
  @IsOptional()
  group?: UserGroupDto;

  @IsDefined()
  @IsString()
  @Column()
  guid: string;

  @IsDefined()
  @IsString()
  @Column()
  name: string;

  @IsDefined()
  @IsString()
  @Column()
  username: string;
}
