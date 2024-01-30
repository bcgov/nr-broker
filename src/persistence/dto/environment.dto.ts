import { ApiHideProperty } from '@nestjs/swagger';
import { Column, Entity, ObjectId, ObjectIdColumn } from 'typeorm';
import { IsDefined, IsNumber, IsString } from 'class-validator';
import { VertexPointerDto } from './vertex-pointer.dto';

@Entity({ name: 'environment' })
export class EnvironmentDto extends VertexPointerDto {
  @ObjectIdColumn()
  @ApiHideProperty()
  id: ObjectId;

  @IsDefined()
  @IsString()
  @Column()
  name: string;

  @IsDefined()
  @IsString()
  @Column()
  short: string;

  @Column()
  @IsDefined()
  aliases: string[];

  @IsDefined()
  @IsString()
  @Column()
  title: string;

  @IsDefined()
  @IsNumber()
  @Column()
  position: number;
}
