import { Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';

@Entity({ name: 'edge' })
export class EdgeDto {
  @ObjectIdColumn()
  id: ObjectID;

  @Column()
  name: string;

  @Column()
  path: number[];

  @Column()
  prop?: any;

  @Column()
  source: string;

  @Column()
  target: string;
}
