import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ObjectId, ObjectIdColumn } from 'typeorm';
import { IsDefined, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { VertexPointerDto } from './vertex-pointer.dto';
import { VaultConfigDto } from './vault-config.dto';

@Entity({ name: 'service' })
export class ServiceDto extends VertexPointerDto {
  @ObjectIdColumn()
  @ApiProperty({ type: () => String })
  id: ObjectId;

  @IsOptional()
  @IsString()
  @Column()
  description?: string;

  @IsDefined()
  @IsString()
  @Column()
  name: string;

  @IsOptional()
  @IsString()
  @Column()
  title?: string;

  @IsOptional()
  @IsString()
  @Column()
  scmUrl?: string;

  @IsOptional()
  @Column(() => VaultConfigDto)
  @Type(() => VaultConfigDto)
  vaultConfig?: VaultConfigDto;
}
