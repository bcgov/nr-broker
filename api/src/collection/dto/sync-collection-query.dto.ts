import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { SyncType } from '../../persistence/dto/sync-queue-config.dto';

export class SyncCollectionQuery {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  queue?: string;

  @IsEnum(SyncType)
  @IsNotEmpty()
  @IsOptional()
  type?: SyncType;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  dryRun?: boolean;
}
