import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, ObjectIdColumn } from 'typeorm';
import { ObjectId } from 'mongodb';
import { GraphDataResponseEdgeDto } from './graph-data.dto';
import { EdgeInsertDto } from './edge-rest.dto';
import { EdgePropDto } from './edge-prop.dto';
import { Transform } from 'class-transformer';

@Entity({ name: 'edge' })
@Index(['source', 'name'])
export class EdgeDto {
  @ObjectIdColumn()
  @ApiProperty({ type: () => String })
  id: ObjectId;

  @Column()
  is: number;

  @Column()
  it: number;

  @Column()
  name: string;

  @Column()
  prop?: EdgePropDto;

  @Column()
  @ApiProperty({ type: () => String })
  @Transform((value) => new ObjectId(value.obj.intention.toString()))
  source: ObjectId;

  @Column()
  @ApiProperty({ type: () => String })
  @Transform((value) => new ObjectId(value.obj.intention.toString()))
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
      is: this.is,
      it: this.it,
      name: this.name,
      prop: this.prop,
      source: this.source.toString(),
      target: this.target.toString(),
    };
  }
}
