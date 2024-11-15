import { Entity, Property } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDefined, IsOptional, IsString } from 'class-validator';
import { ObjectId } from 'mongodb';

@Entity()
export class ActionSourceDto {
  @IsString()
  @IsOptional()
  @Property()
  action?: string;

  @Property()
  @IsDefined()
  @ApiProperty({ type: () => String })
  @Transform((value) =>
    value.obj.intention ? new ObjectId(value.obj.intention.toString()) : null,
  )
  intention: ObjectId;
}
