import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class SyncCollectionQuery {
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  syncSecrets?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  syncUsers?: boolean;
}
