import { ApiHideProperty } from '@nestjs/swagger';
import { Entity, ObjectIdColumn, ObjectId } from 'typeorm';

@Entity({ name: 'user' })
export class UserDto {
  @ObjectIdColumn()
  @ApiHideProperty()
  id: ObjectId;
}
