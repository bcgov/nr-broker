import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, ObjectId, ObjectIdColumn } from 'typeorm';

@Entity({ name: 'edge' })
@Index(['source', 'name'])
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
  @Index()
  target: string;
}
