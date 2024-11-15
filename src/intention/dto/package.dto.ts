import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ObjectId } from 'mongodb';
import { ApiProperty } from '@nestjs/swagger';
import { Entity, Property } from '@mikro-orm/core';

@Entity()
export class PackageDto {
  @Property()
  @IsOptional()
  @ApiProperty({ type: () => String })
  @Transform((value) =>
    value.obj.id ? new ObjectId(value.obj.id.toString()) : null,
  )
  id?: ObjectId;

  @IsString()
  @IsOptional()
  @Property()
  architecture?: string;

  @IsString()
  @IsOptional()
  @Property()
  buildGuid?: string;

  @IsNumber()
  @IsOptional()
  @Property()
  buildNumber?: number;

  @IsString()
  @IsOptional()
  @Property()
  buildVersion?: string;

  @IsString()
  @IsOptional()
  @Property()
  checksum?: string;

  @IsString()
  @IsOptional()
  @Property()
  description?: string;

  @IsString()
  @IsOptional()
  @Property()
  installScope?: string;

  @IsString()
  @IsOptional()
  @Property()
  license?: string;

  @IsString()
  @IsOptional()
  @Property()
  name?: string;

  @IsString()
  @IsOptional()
  @Property()
  path?: string;

  @IsString()
  @IsOptional()
  @Property()
  reference?: string;

  @IsNumber()
  @IsOptional()
  @Property()
  size?: number;

  @IsString()
  @IsOptional()
  @Property()
  type?: string;

  @IsString()
  @IsOptional()
  @Property()
  version?: string;
}
