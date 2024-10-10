import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Entity, Column, Index, ObjectIdColumn } from 'typeorm';
import { IsDate, IsDefined, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ObjectId } from 'mongodb';

@Entity({ name: 'userAliasRequest' })
export class UserAliasRequestDto {
  @ObjectIdColumn()
  @ApiHideProperty()
  id: ObjectId;

  @Column()
  @ApiProperty({ type: () => String })
  @Transform((value) =>
    value.obj.accountId ? new ObjectId(value.obj.accountId.toString()) : null,
  )
  @Index()
  accountId: ObjectId;

  @Column()
  @IsDate()
  createdAt: Date;

  @IsDefined()
  @IsString()
  @Column()
  domain: string;

  @IsDefined()
  @IsString()
  @Column()
  state: string;
}
