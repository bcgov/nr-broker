import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, ObjectIdColumn } from 'typeorm';
import { ObjectId } from 'mongodb';
import {
  IsDefined,
  IsNotEmptyObject,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { GraphDataResponseEdgeDto } from './graph-data.dto';
import { EdgeInsertDto } from './edge-rest.dto';
import { EdgePropDto } from './edge-prop.dto';
import { Transform, Type } from 'class-transformer';
import { IsValidProp } from '../../util/validator.util';
import { TimestampDto } from './timestamp.dto';

@Entity({ name: 'edge' })
@Index(['source', 'name'])
export class EdgeDto {
  @ObjectIdColumn()
  @ApiProperty({ type: () => String })
  id: ObjectId;

  @Column()
  @IsDefined()
  @IsNumber()
  is: number;

  @Column()
  @IsDefined()
  @IsNumber()
  it: number;

  @Column()
  @IsDefined()
  @IsString()
  name: string;

  @Column()
  @IsOptional()
  @IsValidProp()
  @IsNotEmptyObject()
  prop?: EdgePropDto;

  @Column()
  @ApiProperty({ type: () => String })
  @Transform((value) =>
    value.obj.source ? new ObjectId(value.obj.source.toString()) : null,
  )
  @IsDefined()
  source: ObjectId;

  @Column()
  @ApiProperty({ type: () => String })
  @Transform((value) =>
    value.obj.target ? new ObjectId(value.obj.target.toString()) : null,
  )
  @Index()
  @IsDefined()
  target: ObjectId;

  @IsOptional()
  @Column(() => TimestampDto)
  @Type(() => TimestampDto)
  timestamps?: TimestampDto;

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
