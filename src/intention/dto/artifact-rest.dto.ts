import { IsDefined, IsNumber, IsString } from 'class-validator';
import { IsValidHash } from '../../util/validator.util';
import { Entity, Property } from '@mikro-orm/core';

@Entity()
export class ArtifactDto {
  @Property()
  @IsDefined()
  @IsString()
  @IsValidHash()
  checksum: string;

  @Property()
  @IsDefined()
  @IsString()
  name: string;

  @Property()
  @IsDefined()
  @IsNumber()
  size: number;

  @Property()
  @IsDefined()
  @IsString()
  type: string;
}
