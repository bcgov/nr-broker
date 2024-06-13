import {
  IsDefined,
  IsNumber,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { IsValidHash } from '../../util/validator.util';
import { Entity, Column } from 'typeorm';

@Entity()
export class ArtifactDto {
  @Column()
  @IsOptional()
  @IsString()
  @IsValidHash()
  checksum?: string;

  @Column()
  @IsDefined()
  @IsString()
  @Length(1)
  name: string;

  @Column()
  @IsOptional()
  @IsNumber()
  size?: number;

  @Column()
  @IsOptional()
  @IsString()
  type?: string;
}
