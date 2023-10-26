import { ApiHideProperty } from '@nestjs/swagger';
import { Column, Entity, ObjectId, ObjectIdColumn } from 'typeorm';
import {
  IsDate,
  IsDefined,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { VertexPointerDto } from './vertex-pointer.dto';

export class PackageInstallationHistoryDto {
  @IsOptional()
  @IsString()
  @Column()
  architecture?: string;

  @IsOptional()
  @IsString()
  @Column()
  buildVersion?: string;

  @IsOptional()
  @IsString()
  @Column()
  checksum?: string;

  @IsOptional()
  @IsString()
  @Column()
  description?: string;

  @IsOptional()
  @IsString()
  @Column()
  installScope?: string;

  @IsOptional()
  @IsDate()
  @Column()
  installed: Date;

  @IsOptional()
  @IsString()
  @Column()
  license?: string;

  @IsOptional()
  @IsString()
  @Column()
  name?: string;

  @IsOptional()
  @IsString()
  @Column()
  path?: string;

  @IsOptional()
  @IsString()
  @Column()
  reference?: string;

  @IsOptional()
  @IsNumber()
  @Column()
  size?: number;

  @IsOptional()
  @IsString()
  @Column()
  type?: string;

  @IsDefined()
  @IsString()
  @Column()
  version: string;

  @IsDefined()
  @IsString()
  @Column()
  userId: string;
}

@Entity({ name: 'serviceInstance' })
export class ServiceInstanceDto extends VertexPointerDto {
  @ObjectIdColumn()
  @ApiHideProperty()
  id: ObjectId;

  @IsDefined()
  @IsString()
  @Column()
  name: string;

  @IsOptional()
  @Column(() => PackageInstallationHistoryDto)
  pkgInstallHistory?: PackageInstallationHistoryDto[];
}
