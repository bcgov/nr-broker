import { ApiHideProperty } from '@nestjs/swagger';
import { Column, Entity, ObjectId, ObjectIdColumn } from 'typeorm';
import { IsDefined, IsString } from 'class-validator';
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
  aliases: string[];
}
