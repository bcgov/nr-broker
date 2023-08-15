import { ApiHideProperty } from '@nestjs/swagger';
import { Entity, ObjectIdColumn, ObjectId, Column } from 'typeorm';
import { VertexPointerDto } from './vertex-pointer.dto';

@Entity({ name: 'brokerAccount' })
export class BrokerAccountDto extends VertexPointerDto {
  @ObjectIdColumn()
  @ApiHideProperty()
  id: ObjectId;

  @Column()
  email: string;

  @Column()
  clientId: string;

  @Column()
  name: string;

  @Column()
  enableUserImport: boolean;

  @Column()
  requireRoleId: boolean;

  @Column()
  requireProjectExists: boolean;

  @Column()
  requireServiceExists: boolean;
}
