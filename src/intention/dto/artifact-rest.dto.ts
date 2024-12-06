import { IsDefined, IsNumber, IsString } from 'class-validator';
import { IsValidHash } from '../../util/validator.util';

export class ArtifactDto {
  @IsDefined()
  @IsString()
  @IsValidHash()
  checksum: string;

  @IsDefined()
  @IsString()
  name: string;

  @IsDefined()
  @IsNumber()
  size: number;

  @IsDefined()
  @IsString()
  type: string;
}
