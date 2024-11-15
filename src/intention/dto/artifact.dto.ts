import {
  IsDefined,
  IsNumber,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { IsValidHash } from '../../util/validator.util';
import { Entity, Property } from '@mikro-orm/core';

@Entity()
export class ArtifactDto {
  @Property()
  @IsOptional()
  @IsString()
  @IsValidHash()
  checksum?: string;

  @Property()
  @IsDefined()
  @IsString()
  @Length(1)
  name: string;

  @Property()
  @IsOptional()
  @IsNumber()
  size?: number;

  @Property()
  @IsOptional()
  @IsString()
  type?: string;
}
