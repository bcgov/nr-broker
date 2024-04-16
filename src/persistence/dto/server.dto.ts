import { ApiHideProperty } from '@nestjs/swagger';
import { Entity, ObjectIdColumn, ObjectId, Column } from 'typeorm';
import { IsDate, IsDefined, IsOptional, IsString } from 'class-validator';
import { VertexPointerDto } from './vertex-pointer.dto';

@Entity({ name: 'server' })
export class ServerDto extends VertexPointerDto {
  @ObjectIdColumn()
  @ApiHideProperty()
  id: ObjectId;

  @IsDefined()
  @IsDate()
  @Column()
  acquired: Date;

  @IsOptional()
  @IsString()
  @Column()
  architecture?: string;

  @IsOptional()
  @IsString()
  @Column()
  description?: string;

  @IsDefined()
  @IsString()
  @Column()
  hostName: string;

  @IsDefined()
  @IsString()
  @Column()
  name: string;

  @IsOptional()
  @IsString()
  @Column()
  osFamily?: string;

  @IsOptional()
  @IsString()
  @Column()
  osFull?: string;

  @IsOptional()
  @IsString()
  @Column()
  osKernal?: string;

  @IsOptional()
  @IsString()
  @Column()
  osName?: string;

  @IsOptional()
  @IsString()
  @Column()
  osType?: string;

  @IsOptional()
  @IsString()
  @Column()
  osPlatform?: string;

  @IsOptional()
  @IsString()
  @Column()
  osVersion?: string;
}
