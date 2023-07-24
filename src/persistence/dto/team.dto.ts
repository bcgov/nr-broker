import { ApiHideProperty } from '@nestjs/swagger';
import { Entity, ObjectIdColumn, ObjectId, Column } from 'typeorm';
import { VertexPointerDto } from './vertex-pointer.dto';

@Entity({ name: 'team' })
export class TeamDto extends VertexPointerDto {
  @ObjectIdColumn()
  @ApiHideProperty()
  id: ObjectId;

  @Column()
  email: string;

  @Column()
  name: string;

  @Column()
  website?: string;
}
