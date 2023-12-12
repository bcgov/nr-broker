import { ApiProperty } from '@nestjs/swagger';
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
  intention: ObjectId;
}
