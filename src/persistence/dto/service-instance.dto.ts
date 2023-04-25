import { ApiHideProperty } from '@nestjs/swagger';
import { Column, Entity, ObjectId, ObjectIdColumn } from 'typeorm';
import { VertexPointerDto } from './vertex-pointer.dto';

@Entity({ name: 'serviceInstance' })
export class ServiceInstanceDto extends VertexPointerDto {
  @ObjectIdColumn()
  @ApiHideProperty()
  id: ObjectId;

  @Column()
  name: string;

  @Column()
  key: string;
}
