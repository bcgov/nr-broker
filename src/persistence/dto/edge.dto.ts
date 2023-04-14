import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';

@Entity({ name: 'edge' })
export class EdgeDto {
  @ObjectIdColumn()
  @ApiProperty({ type: () => String })
  id: ObjectID;

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
