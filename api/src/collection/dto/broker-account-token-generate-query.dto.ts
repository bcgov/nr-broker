import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max } from 'class-validator';
import { SyncCollectionQuery } from './sync-collection-query.dto';

export const DAYS_365_IN_SECONDS = 60 * 60 * 24 * 365;

export class BrokerAccountTokenGenerateQuery extends SyncCollectionQuery {
  @IsInt()
  @Max(DAYS_365_IN_SECONDS)
  @Type(() => Number)
  expiration!: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  patch?: boolean;
}
