import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { VertexEntity } from './vertex.entity';
import { EdgeEntity } from './edge.entity';
import { Transform } from 'class-transformer';

@Entity({ tableName: 'graphRequestDto' })
export class GraphRequestDto {
  @ApiHideProperty()
  @Transform((value) =>
    value.obj.id ? new ObjectId(value.obj.id.toString()) : null,
  )
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  created: Date;

  @Property()
  type: 'edge' | 'vertex';

  @Property()
  data: Omit<EdgeEntity, 'id'> | Omit<VertexEntity, 'id'>;

  @Property()
  @ApiProperty({ type: () => String })
  @Transform((value) =>
    value.obj.requestor ? new ObjectId(value.obj.requestor.toString()) : null,
  )
  requestor: ObjectId;
}
