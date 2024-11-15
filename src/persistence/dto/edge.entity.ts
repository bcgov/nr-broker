import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import {
  Embedded,
  Entity,
  Index,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { IsNotEmptyObject } from 'class-validator';
import { EdgeInsertDto, EdgeRestDto } from './edge-rest.dto';
import { EdgePropDto } from './edge-prop.dto';
import { IsValidProp } from '../../util/validator.util';
import { TimestampDto } from './timestamp.dto';

@Entity({ tableName: 'edge' })
// @Index(['source', 'name'])
export class EdgeEntity {
  @ApiHideProperty()
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  is: number;

  @Property()
  it: number;

  @Property()
  name: string;

  @Property({ nullable: true })
  @IsValidProp()
  @IsNotEmptyObject()
  prop?: EdgePropDto;

  @Property()
  @ApiProperty({ type: () => String })
  source: ObjectId;

  @Property()
  @ApiProperty({ type: () => String })
  @Index()
  target: ObjectId;

  @Embedded({ entity: () => TimestampDto, nullable: true })
  timestamps?: TimestampDto;

  static upgradeInsertDto(value: EdgeInsertDto): EdgeEntity {
    const edge = new EdgeEntity();
    edge.name = value.name;
    if (value.prop) {
      edge.prop = value.prop;
    }
    edge.source = new ObjectId(value.source);
    edge.target = new ObjectId(value.target);

    return edge;
  }

  public toEdgeResponse(includeOptional = true): EdgeRestDto {
    return {
      id: this.id.toString(),
      is: this.is,
      it: this.it,
      name: this.name,
      ...(includeOptional ? { prop: this.prop } : {}),
      source: this.source.toString(),
      target: this.target.toString(),
      ...(includeOptional && this.timestamps
        ? {
            timestamps: {
              ...(this.timestamps.createdAt
                ? { createdAt: this.timestamps.createdAt.getTime() }
                : {}),
              ...(this.timestamps.updatedAt
                ? { updatedAt: this.timestamps.updatedAt.getTime() }
                : {}),
            },
          }
        : {}),
    };
  }
}
