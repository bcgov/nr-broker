import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Entity, ObjectIdColumn, Column } from 'typeorm';
import { IsDefined, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ObjectId } from 'mongodb';
import { VertexPointerDto } from './vertex-pointer.dto';

export class UserAliasDto {
  @IsDefined()
  @IsString()
  @Column()
  domain: string;

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

export class UserGroupDto {
  @Column()
  domain?: string;

  @Column()
  @ApiProperty({ type: () => String })
  @Transform((value) =>
    value.obj.id ? new ObjectId(value.obj.id.toString()) : null,
  )
  id?: ObjectId;

  @Column()
  name?: string;
}

@Entity({ name: 'user' })
export class UserDto extends VertexPointerDto {
  @ObjectIdColumn()
  @ApiHideProperty()
  @Transform((value) =>
    value.obj.id ? new ObjectId(value.obj.id.toString()) : null,
  )
  id: ObjectId;

  @IsOptional()
  @Column(() => UserAliasDto, { array: true })
  @Type(() => UserAliasDto)
  alias?: UserAliasDto[];

  @IsDefined()
  @IsString()
  @Column()
  domain: string;

  @IsDefined()
  @IsString()
  @Column()
  email: string;

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
