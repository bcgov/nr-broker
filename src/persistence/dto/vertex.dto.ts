import { Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';
import { PointGeom } from './point.geom';
import { ApiProperty } from '@nestjs/swagger';
import { VertexPointerDto } from './vertex-pointer.dto';

@Entity({ name: 'vertex' })
export class VertexDto {
  @ObjectIdColumn()
  @ApiProperty({ type: () => String })
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

export class VertexCollectionDto extends VertexDto {
  @ApiProperty({ type: () => VertexPointerDto })
  data: VertexPointerDto;
}
