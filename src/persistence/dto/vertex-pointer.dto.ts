import { ApiProperty } from '@nestjs/swagger';
import { Column, ObjectID } from 'typeorm';

export abstract class VertexPointerDto {
  @Column(() => ObjectID)
  @ApiProperty({ type: () => String })
  vertex: ObjectID;
}
