import { Column, Entity, Index, ObjectId, ObjectIdColumn } from 'typeorm';
import { PointGeom } from './point.geom';
import { ApiProperty } from '@nestjs/swagger';
import { VertexPointerDto } from './vertex-pointer.dto';
import { VertexInsertDto } from './vertex-rest.dto';
import { CollectionDtoUnion } from './collection-dto-union.type';

@Entity({ name: 'vertex' })
export class VertexDto {
  @ObjectIdColumn()
  @ApiProperty({ type: () => String })
  id: ObjectId;

  @Index()
  @Column()
  @ApiProperty({ type: () => String })
  collection: keyof CollectionDtoUnion;

  @Column(() => PointGeom)
  geo?: PointGeom;

  @Column()
  name: string;

  /**
   * prop.label: Special case for labeling a vertex
   */
  @Column()
  prop?: any;

  static upgradeInsertDto(value: VertexInsertDto): VertexDto {
    const vertex = new VertexDto();
    vertex.collection = value.collection;
    if (value.geo) {
      vertex.geo = value.geo;
    }
    if (value.prop) {
      vertex.prop = value.prop;
    }

    return vertex;
  }
}

export class VertexCollectionDto extends VertexDto {
  @ApiProperty({ type: () => VertexPointerDto })
  data: VertexPointerDto;
}
