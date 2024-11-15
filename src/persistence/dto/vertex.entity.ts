import {
  Entity,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
  Index,
  Embedded,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { IsNotEmptyObject } from 'class-validator';

import { PointGeom } from './point.geom';

import { CollectionDtoUnion } from './collection-dto-union.type';
import { VertexInsertDto, VertexPropDto } from './vertex-rest.dto';
import { IsValidProp } from '../../util/validator.util';
import { TimestampDto } from './timestamp.dto';

@Entity({ tableName: 'vertex' })
export class VertexEntity {
  @ApiHideProperty()
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Index()
  @Property()
  @ApiProperty({ type: () => String })
  collection: keyof CollectionDtoUnion;

  @Embedded({ entity: () => PointGeom, nullable: true })
  geo?: PointGeom;

  @Property()
  name: string;

  /**
   * prop.label: Special case for labeling a vertex
   */
  @Property({ nullable: true })
  @IsValidProp()
  @IsNotEmptyObject()
  prop?: VertexPropDto;

  @Embedded({ entity: () => TimestampDto, nullable: true })
  timestamps?: TimestampDto;

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
