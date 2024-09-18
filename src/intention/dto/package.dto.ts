import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Entity, Column } from 'typeorm';
import { ObjectId } from 'mongodb';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class PackageDto {
  @Column()
  @IsOptional()
  @ApiProperty({ type: () => String })
  @Transform((value) =>
    value.obj.id ? new ObjectId(value.obj.id.toString()) : null,
  )
  id?: ObjectId;

  @IsString()
  @IsOptional()
  @Column()
  architecture?: string;

  @IsString()
  @IsOptional()
  @Column()
  buildGuid?: string;

  @IsNumber()
  @IsOptional()
  @Column()
  buildNumber?: number;

  @IsString()
  @IsOptional()
  @Column()
  buildVersion?: string;

  @IsString()
  @IsOptional()
  @Column()
  checksum?: string;

  @IsString()
  @IsOptional()
  @Column()
  description?: string;

  @IsString()
  @IsOptional()
  @Column()
  installScope?: string;

  @IsString()
  @IsOptional()
  @Column()
  license?: string;

  @IsString()
  @IsOptional()
  @Column()
  name?: string;

  @IsString()
  @IsOptional()
  @Column()
  path?: string;

  @IsString()
  @IsOptional()
  @Column()
  reference?: string;

  @IsNumber()
  @IsOptional()
  @Column()
  size?: number;

  @IsString()
  @IsOptional()
  @Column()
  type?: string;

  @IsString()
  @IsOptional()
  @Column()
  version?: string;
}
