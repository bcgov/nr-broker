import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ObjectId, ObjectIdColumn } from 'typeorm';

@Entity({ name: 'edge' })
export class EdgeDto {
  @ObjectIdColumn()
  @ApiProperty({ type: () => String })
  id: ObjectId;

  @Column()
  name: string;

  @Column()
  prop?: any;

  @Column()
  st?: number[];

  @Column()
  source: string;

  @Column()
  target: string;
}
