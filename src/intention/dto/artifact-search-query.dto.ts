import { Type } from 'class-transformer';
import { IsInt, IsString } from 'class-validator';

export class ArtifactSearchQuery {
  @IsString()
  checksum: string;

  @IsString()
  service: string;

  @IsInt()
  @Type(() => Number)
  offset: number;

  @IsInt()
  @Type(() => Number)
  limit: number;
}
