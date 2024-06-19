import { IsDefined, IsNumber, IsString } from 'class-validator';
import { IsValidHash } from '../../util/validator.util';
import { Entity, Column } from 'typeorm';

@Entity()
export class ArtifactDto {
  @Column()
  @IsDefined()
  @IsString()
  @IsValidHash()
  checksum: string;

  @Column()
  @IsDefined()
  @IsString()
  name: string;

  @Column()
  @IsDefined()
  @IsNumber()
  size: number;

  @Column()
  @IsDefined()
  @IsString()
  type: string;
}
