import { ApiHideProperty } from '@nestjs/swagger';
import { Entity, ObjectIdColumn, ObjectId, Column } from 'typeorm';
import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';
import { VertexPointerDto } from './vertex-pointer.dto';

@Entity({ name: 'brokerAccount' })
export class BrokerAccountDto extends VertexPointerDto {
  @ObjectIdColumn()
  @ApiHideProperty()
  id: ObjectId;

  @IsDefined()
  @IsString()
  @Column()
  email: string;

  @IsDefined()
  @IsString()
  @Column()
  clientId: string;

  @IsDefined()
  @IsString()
  @Column()
  name: string;

  @IsOptional()
  @IsString()
  @Column()
  website?: string;

  @IsDefined()
  @IsBoolean()
  @Column()
  enableUserImport: boolean;

  @IsDefined()
  @IsBoolean()
  @Column()
  requireRoleId: boolean;

  @IsDefined()
  @IsBoolean()
  @Column()
  requireProjectExists: boolean;

  @IsDefined()
  @IsBoolean()
  @Column()
  requireServiceExists: boolean;

  @IsDefined()
  @IsBoolean()
  @Column()
  skipUserValidation: boolean;
}
