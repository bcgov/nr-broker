import { Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';
import { PointGeom } from './point.geom';

@Entity({ name: 'vertex' })
export class VertexDto {
  @ObjectIdColumn()
  id: ObjectID;

  @Column()
  collection: string;

  @Column(() => PointGeom)
  geo?: PointGeom;

  @Column()
  name: string;

  /**
   * prop.label: Special case for labeling a vertex
   */
  @Column()
  prop?: any;
}
