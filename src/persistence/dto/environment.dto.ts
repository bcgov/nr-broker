import { ApiHideProperty } from '@nestjs/swagger';
import { Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';
import { VertexPointerDto } from './vertex-pointer.dto';

@Entity({ name: 'environment' })
export class EnvironmentDto extends VertexPointerDto {
  @ObjectIdColumn()
  @ApiHideProperty()
  id: ObjectID;

  @Column()
  name: string;

  @Column()
  key: string;
}
