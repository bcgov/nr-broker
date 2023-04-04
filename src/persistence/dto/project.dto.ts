import { ApiHideProperty } from '@nestjs/swagger';
import { Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';
import { VertexPointerDto } from './vertex-pointer.dto';

@Entity({ name: 'project' })
export class ProjectDto extends VertexPointerDto {
  @ObjectIdColumn()
  @ApiHideProperty()
  id: ObjectID;

  @Column()
  name: string;

  @Column()
  key: string;
}
