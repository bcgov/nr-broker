import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ObjectId, ObjectIdColumn } from 'typeorm';
import { VertexPointerDto } from './vertex-pointer.dto';

@Entity({ name: 'project' })
export class ProjectDto extends VertexPointerDto {
  @ObjectIdColumn()
  @ApiProperty({ type: () => String })
  id: ObjectId;

  @Column()
  email?: string;

  @Column()
  name: string;

  @Column()
  configuration: any;

  @Column()
  website?: string;
}
