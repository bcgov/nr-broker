import { ApiProperty } from '@nestjs/swagger';
import { Column } from 'typeorm';
import { ObjectId } from 'mongodb';

export abstract class VertexPointerDto {
  @Column()
  @ApiProperty({ type: () => String })
  vertex: ObjectId;
}
