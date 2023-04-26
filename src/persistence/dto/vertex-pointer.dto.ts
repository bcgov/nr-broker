import { ApiProperty } from '@nestjs/swagger';
import { Column, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

export abstract class VertexPointerDto {
  @Column()
  @ApiProperty({ type: () => String })
  @Index()
  vertex: ObjectId;
}
