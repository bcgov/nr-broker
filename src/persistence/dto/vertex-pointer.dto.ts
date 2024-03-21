import { ApiProperty } from '@nestjs/swagger';
import { Column, Index } from 'typeorm';
import { ObjectId } from 'mongodb';
import { IsArray, IsOptional } from 'class-validator';

export abstract class VertexPointerDto {
  @Column()
  @ApiProperty({ type: () => String })
  @Index()
  vertex: ObjectId;

  @Column()
  @IsOptional()
  @IsArray()
  @Index()
  tags?: string[];
}
