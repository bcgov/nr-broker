import { ApiProperty } from '@nestjs/swagger';
import { Column } from 'typeorm';
import { ObjectID } from 'mongodb';

export abstract class VertexPointerDto {
  // vertex should be defined as ObjectID but typeorm can't handle a non-id being a ObjectID.
  @Column()
  @ApiProperty({ type: () => String })
  vertex: ObjectID;
}
