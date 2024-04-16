import { ApiProperty } from '@nestjs/swagger';
import { Column, Index } from 'typeorm';
import { ObjectId } from 'mongodb';
import { IsArray, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export abstract class VertexPointerDto {
  @Column()
  @ApiProperty({ type: () => String })
  @Transform((value) => new ObjectId(value.obj.intention.toString()))
  @Index()
  vertex: ObjectId;

  @Column()
  @IsOptional()
  @IsArray()
  @Index()
  tags?: string[];
}
