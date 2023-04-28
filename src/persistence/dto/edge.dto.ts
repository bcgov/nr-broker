import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, ObjectIdColumn } from 'typeorm';
import { ObjectId } from 'mongodb';
import { GraphDataResponseEdgeDto } from './graph-data.dto';
import { EdgeInsertDto } from './edge-rest.dto';

@Entity({ name: 'edge' })
@Index(['source', 'name'])
export class EdgeDto {
  @ObjectIdColumn()
  @ApiProperty({ type: () => String })
  id: ObjectId;

  @Column()
  name: string;

  @Column()
  prop?: any;

  @Column()
  st: number[];

  @Column()
  @ApiProperty({ type: () => String })
  source: ObjectId;

  @Column()
  @ApiProperty({ type: () => String })
  @Index()
  target: ObjectId;

  static upgradeInsertDto(value: EdgeInsertDto): EdgeDto {
    const edge = new EdgeDto();
    edge.name = value.name;
    if (value.prop) {
      edge.prop = value.prop;
    }
    edge.source = new ObjectId(value.source);
    edge.target = new ObjectId(value.target);

    return edge;
  }

  public toEdgeResponse(): GraphDataResponseEdgeDto {
    return {
      id: this.id.toString(),
      name: this.name,
      prop: this.prop,
      st: this.st,
      source: this.source.toString(),
      target: this.target.toString(),
    };
  }
}
