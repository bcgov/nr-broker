import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { ObjectId } from 'mongodb';
import { Column, Entity } from 'typeorm';

@Entity()
export class UserGroupDto {
  @IsString()
  @IsOptional()
  @Column()
  domain: string;

  @IsOptional()
  @Column()
  @ApiProperty({ type: () => String })
  @Transform((value) =>
    value.obj.id ? new ObjectId(value.obj.id.toString()) : null,
  )
  id: ObjectId;

  @IsString()
  @IsOptional()
  @Column()
  name: string;
}
