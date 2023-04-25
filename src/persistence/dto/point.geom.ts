import { Column, Entity } from 'typeorm';

@Entity()
export class PointGeom {
  @Column()
  type: 'Point';

  @Column()
  coordinates: number[];
}
