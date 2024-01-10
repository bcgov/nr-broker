import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ObjectIdColumn } from 'typeorm';
import { ObjectId } from 'mongodb';
import { VertexDto } from './vertex.dto';
import { EdgeDto } from './edge.dto';

@Entity({ name: 'graphRequestDto' })
export class GraphRequestDto {
  @ObjectIdColumn()
  @ApiProperty({ type: () => String })
  id: ObjectId;

  @Column()
  created: Date;

  @Column()
  type: 'edge' | 'vertex';

  @Column()
  data: Omit<EdgeDto, 'id'> | Omit<VertexDto, 'id'>;

  @Column()
  requestor: ObjectId;
}
