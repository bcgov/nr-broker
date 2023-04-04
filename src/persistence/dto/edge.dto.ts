import { Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';

@Entity({ name: 'edge' })
export class EdgeDto {
  @ObjectIdColumn()
  id: ObjectID;

  @Column()
  label: string;

  @Column()
  prop?: any;

  @Column()
  source: string;

  @Column()
  target: string;
}
