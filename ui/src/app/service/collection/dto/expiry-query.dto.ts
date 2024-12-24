import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max } from 'class-validator';

export const DAYS_365_IN_SECONDS = 60 * 60 * 24 * 365;

export class ExpiryQuery {
  @IsInt()
  @Max(DAYS_365_IN_SECONDS)
  @Type(() => Number)
  expiration!: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  patch?: boolean;
}
