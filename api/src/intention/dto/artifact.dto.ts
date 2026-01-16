import {
  IsDefined,
  IsNumber,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { IsValidHash } from '../../util/validator.decorator';

export class ArtifactDto {
  @IsOptional()
  @IsString()
  @IsValidHash()
  checksum?: string;

  @IsDefined()
  @IsString()
  @Length(1)
  name!: string;

  @IsOptional()
  @IsNumber()
  size?: number;

  @IsOptional()
  @IsString()
  type?: string;
}
