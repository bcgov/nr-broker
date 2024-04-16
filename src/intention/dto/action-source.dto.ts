import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDefined, IsOptional, IsString } from 'class-validator';
import { ObjectId } from 'mongodb';
import { Entity, Column } from 'typeorm';

@Entity()
export class ActionSourceDto {
  @IsString()
  @IsOptional()
  @Column()
  action?: string;

  @Column()
  @IsDefined()
  @ApiProperty({ type: () => String })
  @Transform((value) =>
    value.obj.intention ? new ObjectId(value.obj.intention.toString()) : null,
  )
  intention: ObjectId;
}
