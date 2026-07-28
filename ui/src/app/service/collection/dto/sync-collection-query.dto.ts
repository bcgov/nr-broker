import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SyncCollectionQuery {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  queue?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  type?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  dryRun?: boolean;
}
