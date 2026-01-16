import {
  Entity,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
  Index,
  Embedded,
  BaseEntity,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

import { PointGeomEmbeddable } from './point-geom.embeddable';

import { VertexInsertDto, VertexPropDto } from '../dto/vertex.dto';
import { TimestampEmbeddable } from './timestamp.embeddable';
import { CollectionEntityUnion } from './collection-entity-union.type';

@Entity({ tableName: 'vertex' })
@Index({ options: { 'timestamps.createdAt': 1 } })
@Index({ options: { 'timestamps.updatedAt': 1 } })
export class VertexEntity extends BaseEntity {
  @ApiHideProperty()
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Index()
  @Property()
  @ApiProperty({ type: () => String })
  collection: keyof CollectionEntityUnion;

  @Embedded({ entity: () => PointGeomEmbeddable, nullable: true, object: true })
  geo?: PointGeomEmbeddable;

  @Property()
  name: string;

  /**
   * prop.label: Special case for labeling a vertex
   */
  @Property({ nullable: true })
  prop?: VertexPropDto;

  @Embedded({ entity: () => TimestampEmbeddable, nullable: true, object: true })
  timestamps?: TimestampEmbeddable;

  static upgradeInsertDto(value: VertexInsertDto): VertexEntity {
    const vertex = new VertexEntity();
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
