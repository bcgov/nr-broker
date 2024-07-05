import { ApiProperty } from '@nestjs/swagger';
import { Column, Index } from 'typeorm';
import { ObjectId } from 'mongodb';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

import { TimestampDto } from './timestamp.dto';

export abstract class VertexPointerDto {
  @Column()
  @ApiProperty({ type: () => String })
  @Transform((value) =>
    value.obj.vertex ? new ObjectId(value.obj.vertex.toString()) : null,
  )
  @Index()
  vertex: ObjectId;

  @Column()
  @IsOptional()
  @IsArray()
  @Index()
  @IsString({
    each: true,
  })
  tags?: string[];

  @IsOptional()
  @Column(() => TimestampDto)
  @Type(() => TimestampDto)
  timestamps?: TimestampDto;
}
