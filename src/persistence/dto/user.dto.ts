import { ApiHideProperty } from '@nestjs/swagger';
import { Entity, ObjectIdColumn, ObjectId, Column } from 'typeorm';
import { VertexPointerDto } from './vertex-pointer.dto';

@Entity({ name: 'user' })
export class UserDto extends VertexPointerDto {
  @ObjectIdColumn()
  @ApiHideProperty()
  id: ObjectId;

  @Column()
  email: string;

  @Column()
  guid: string;

  @Column()
  name: string;

  @Column()
  roles?: string[];

  @Column()
  username: string;
}
