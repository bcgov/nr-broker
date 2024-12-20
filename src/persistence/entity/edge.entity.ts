import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import {
  BaseEntity,
  Embedded,
  Entity,
  Index,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { EdgeInsertDto, EdgeDto } from '../dto/edge.dto';
import { TimestampEmbeddable } from './timestamp.embeddable';
import { EdgePropEmbeddable } from './edge-prop.embeddable';

@Entity({ tableName: 'edge' })
@Index({ options: { 'timestamps.createdAt': 1 } })
@Index({ options: { 'timestamps.updatedAt': 1 } })
export class EdgeEntity extends BaseEntity {
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

  @Property({
    type: 'json',
    nullable: true,
  })
  prop?: EdgePropEmbeddable = new EdgePropEmbeddable();

  @Property()
  @ApiProperty({ type: () => String })
  source: ObjectId;

  @Property()
  @ApiProperty({ type: () => String })
  @Index()
  target: ObjectId;

  @Embedded({ entity: () => TimestampEmbeddable, nullable: true, object: true })
  timestamps?: TimestampEmbeddable;

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

  public toEdgeResponse(includeOptional = true): EdgeDto {
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
