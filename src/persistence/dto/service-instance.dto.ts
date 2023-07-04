import { ApiHideProperty } from '@nestjs/swagger';
import { Column, Entity, ObjectId, ObjectIdColumn } from 'typeorm';
import { VertexPointerDto } from './vertex-pointer.dto';

export class PackageInstallationHistoryDto {
  @Column()
  architecture?: string;

  @Column()
  buildVersion?: string;

  @Column()
  checksum?: string;

  @Column()
  description?: string;

  @Column()
  installScope?: string;

  @Column()
  installed: Date;

  @Column()
  license?: string;

  @Column()
  name?: string;

  @Column()
  path?: string;

  @Column()
  reference?: string;

  @Column()
  size?: number;

  @Column()
  type?: string;

  @Column()
  version: string;

  @Column()
  userId: string;
}

@Entity({ name: 'serviceInstance' })
export class ServiceInstanceDto extends VertexPointerDto {
  @ObjectIdColumn()
  @ApiHideProperty()
  id: ObjectId;

  @Column()
  name: string;

  @Column(() => PackageInstallationHistoryDto)
  pkgInstallHistory?: PackageInstallationHistoryDto[];
}
